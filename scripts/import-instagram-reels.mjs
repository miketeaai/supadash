#!/usr/bin/env node
/**
 * Import Instagram Reels from RapidAPI instagram-looter2 `/reels` into Supabase `social_media_data`.
 *
 * API: GET https://instagram-looter2.p.rapidapi.com/reels?id=<pk>&count=<n>
 *   (optional pagination: max_id if returned in paging_info — varies by API version)
 *
 * Same row shape as TikTok import; NOT NULL extras match import-scraptik-user-posts.mjs.
 *
 * Env (.env or .env.local):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAPIDAPI_KEY
 *   RAPIDAPI_HOST (optional, default instagram-looter2.p.rapidapi.com)
 *   SCRAPTIK_IMPORT_NOT_NULL_DEFAULTS (optional) JSON merged for extra NOT NULL columns
 *
 * Usage:
 *   node scripts/import-instagram-reels.mjs <instagram_user_pk_or_id> [options]
 *   npm run import:instagram-reels -- <id> ...
 *
 * Options:
 *   --campaign=<string>   default ""
 *   --count=<n>           page size (default 12)
 *   --max-pages=<n>       cap pagination (default unlimited)
 *   --dry-run
 *   --insert-only
 *   --delay-ms=<n>        between pages (default 600)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const RAPIDAPI_HOST_DEFAULT = "instagram-looter2.p.rapidapi.com";

const SOCIAL_MEDIA_DATA_NOT_NULL_DEFAULTS = {
  ["interface"]: "yes",
  dms: 1,
};

function mergedNotNullDefaults() {
  const out = { ...SOCIAL_MEDIA_DATA_NOT_NULL_DEFAULTS };
  const raw = process.env.SCRAPTIK_IMPORT_NOT_NULL_DEFAULTS;
  if (!raw) return out;
  try {
    const extra = JSON.parse(raw);
    if (extra && typeof extra === "object" && !Array.isArray(extra)) {
      Object.assign(out, extra);
    }
  } catch {
    console.warn("SCRAPTIK_IMPORT_NOT_NULL_DEFAULTS: invalid JSON, ignoring");
  }
  return out;
}

function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function parseArgs(argv) {
  const positional = [];
  const flags = new Map();
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, ...rest] = a.slice(2).split("=");
      const v = rest.length ? rest.join("=") : true;
      flags.set(k, v);
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function flagString(flags, key, fallback) {
  const v = flags.get(key);
  if (v === true || v === undefined || v === "") return fallback;
  return String(v);
}

function flagNumber(flags, key, fallback) {
  const v = flags.get(key);
  if (v === true || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function flagBool(flags, key) {
  return flags.get(key) === true || flags.get(key) === "";
}

/** @param {number} unixSec */
function createTimeToDateString(unixSec) {
  const d = new Date(unixSec * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {Record<string, unknown>} media
 * @param {{ campaign: string; notNullDefaults: Record<string, string | number | boolean> }} opts
 */
function mapMediaToRow(media, opts) {
  const taken = Number(media.taken_at) || 0;
  const views = Number(media.play_count ?? media.ig_play_count) || 0;
  const likes = Number(media.like_count) || 0;
  const comments = Number(media.comment_count) || 0;
  const shares =
    Number(media.reshare_count ?? media.repost_count ?? media.share_count) || 0;
  const cap =
    media.caption && typeof media.caption === "object" && typeof media.caption.text === "string"
      ? media.caption.text
      : "";
  const code = typeof media.code === "string" && media.code ? media.code : null;
  const pk = media.pk != null ? String(media.pk) : media.id != null ? String(media.id) : "";

  const bookmarked =
    media.clips_metadata &&
    typeof media.clips_metadata === "object" &&
    media.clips_metadata.original_sound_info &&
    typeof media.clips_metadata.original_sound_info === "object" &&
    media.clips_metadata.original_sound_info.consumption_info &&
    typeof media.clips_metadata.original_sound_info.consumption_info === "object" &&
    media.clips_metadata.original_sound_info.consumption_info.is_bookmarked === true
      ? 1
      : 0;

  const links = code ? `https://www.instagram.com/reel/${code}/` : null;

  return {
    post_id: pk,
    date: taken ? createTimeToDateString(taken) : null,
    views,
    likes,
    comments,
    shares,
    saves: bookmarked,
    platform: "instagram",
    caption: cap,
    campaign: opts.campaign,
    cost: null,
    links,
    type: "reel",
    ...opts.notNullDefaults,
  };
}

function validateRow(row) {
  if (!row.post_id) return "missing media pk/id";
  if (!row.date) return "missing date from taken_at";
  if (!row.links) return "missing reel shortcode (links)";
  return null;
}

/**
 * @param {unknown} rawItem
 * @returns {Record<string, unknown> | null}
 */
function extractMedia(rawItem) {
  if (!rawItem || typeof rawItem !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (rawItem);
  if (o.media && typeof o.media === "object") {
    return /** @type {Record<string, unknown>} */ (o.media);
  }
  if (o.pk != null || o.taken_at != null) {
    return o;
  }
  return null;
}

async function fetchReelsPage(igId, { count, maxId, apiKey, host }) {
  const url = new URL(`https://${host}/reels`);
  url.searchParams.set("id", igId);
  url.searchParams.set("count", String(count));
  if (maxId) url.searchParams.set("max_id", String(maxId));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": host,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`RapidAPI non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok) {
    throw new Error(`RapidAPI HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  if (typeof json.status === "string" && json.status !== "ok") {
    throw new Error(`API status=${json.status}: ${JSON.stringify(json).slice(0, 500)}`);
  }

  return json;
}

function nextPageCursor(json) {
  const pg = json.paging_info && typeof json.paging_info === "object" ? json.paging_info : {};
  const more =
    pg.more_available === true ||
    pg.more_available === "true" ||
    pg.more_available === 1;
  const maxId = pg.max_id ?? pg.next_max_id ?? pg.end_cursor ?? null;
  if (more && maxId != null && String(maxId) !== "") {
    return String(maxId);
  }
  return null;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadDotEnv();
  const notNullDefaults = mergedNotNullDefaults();

  const { positional, flags } = parseArgs(process.argv.slice(2));
  const igId = positional[0];

  if (!igId) {
    console.error(
      "Usage: node scripts/import-instagram-reels.mjs <instagram_id_pk> [--campaign=] [--count=12] [--max-pages=N] [--dry-run] [--insert-only] [--delay-ms=600]"
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rapidKey = process.env.RAPIDAPI_KEY;
  const rapidHost = process.env.RAPIDAPI_HOST || RAPIDAPI_HOST_DEFAULT;

  const campaign = flagString(flags, "campaign", "");
  const count = flagNumber(flags, "count", 12);
  const maxPages = flagNumber(flags, "max-pages", Number.POSITIVE_INFINITY);
  const delayMs = flagNumber(flags, "delay-ms", 600);
  const dryRun = flagBool(flags, "dry-run");
  const insertOnly = flagBool(flags, "insert-only");

  if (!rapidKey) {
    console.error("Missing RAPIDAPI_KEY in environment or .env");
    process.exit(1);
  }

  if (!dryRun) {
    if (!supabaseUrl || !supabaseKey) {
      console.error(
        "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY"
      );
      process.exit(1);
    }
  }

  const supabase = dryRun ? null : createClient(supabaseUrl, supabaseKey);

  const allRows = [];
  let maxId = "";

  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await sleep(delayMs);

    const json = await fetchReelsPage(igId, {
      count,
      maxId: page === 1 ? "" : maxId,
      apiKey: rapidKey,
      host: rapidHost,
    });

    const items = Array.isArray(json.items) ? json.items : [];
    let mapped = 0;
    for (const raw of items) {
      const media = extractMedia(raw);
      if (!media) {
        console.warn("Skip item: no media payload");
        continue;
      }
      const row = mapMediaToRow(media, { campaign, notNullDefaults });
      const err = validateRow(row);
      if (err) {
        console.warn(`Skip media (validation): ${err}`, media.pk ?? media.id);
        continue;
      }
      allRows.push(row);
      mapped += 1;
    }

    const next = nextPageCursor(json);
    console.error(
      `Page ${page}: mapped ${mapped}/${items.length} rows, paging more=${Boolean(next)}`
    );

    if (!next) break;
    maxId = next;
  }

  const totalRows = allRows.length;
  console.error(`Total mapped rows: ${totalRows}`);

  if (dryRun) {
    console.log(JSON.stringify(allRows, null, 2));
    return;
  }

  if (totalRows === 0) {
    console.error("Nothing to insert.");
    return;
  }

  const chunkSize = 100;
  let written = 0;

  for (let i = 0; i < allRows.length; i += chunkSize) {
    const chunk = allRows.slice(i, i + chunkSize);

    if (insertOnly) {
      const ids = chunk.map((r) => r.post_id);
      const { data: existing, error: selErr } = await supabase
        .from("social_media_data")
        .select("post_id")
        .in("post_id", ids);

      if (selErr) {
        console.error("Select existing post_id failed:", selErr.message);
        process.exit(1);
      }

      const existingSet = new Set((existing || []).map((r) => String(r.post_id)));
      const toInsert = chunk.filter((r) => !existingSet.has(r.post_id));
      if (toInsert.length === 0) {
        console.error(`Chunk ${i / chunkSize + 1}: all ${chunk.length} already exist, skip`);
        continue;
      }

      const { error } = await supabase.from("social_media_data").insert(toInsert);
      if (error) {
        console.error("Insert failed:", error.message);
        process.exit(1);
      }
      written += toInsert.length;
      console.error(
        `Chunk ${i / chunkSize + 1}: inserted ${toInsert.length} (skipped ${chunk.length - toInsert.length})`
      );
    } else {
      const { error } = await supabase.from("social_media_data").upsert(chunk, {
        onConflict: "post_id",
      });
      if (error) {
        console.error("Upsert failed:", error.message);
        console.error(
          "Hint: add UNIQUE (post_id) on social_media_data, or run with --insert-only."
        );
        process.exit(1);
      }
      written += chunk.length;
      console.error(`Chunk ${i / chunkSize + 1}: upserted ${chunk.length}`);
    }
  }

  console.error(`Done. Rows written (new or updated): ${written}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
