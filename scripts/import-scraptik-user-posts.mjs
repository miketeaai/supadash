#!/usr/bin/env node
/**
 * Import TikTok user posts from Scraptik (RapidAPI) into Supabase `social_media_data`.
 *
 * Schema (align with Supabase Table Editor — repo reads these columns):
 *   post_id, date, views, likes, comments, shares, saves, platform, caption,
 *   campaign, cost, links, type
 *   Plus NOT NULL defaults not from Scraptik: interface = "yes" (text), dms = 1 (integer).
 *   Extend via SCRAPTIK_IMPORT_NOT_NULL_DEFAULTS (JSON; strings or numbers).
 *
 * Supabase setup:
 *   - RLS: use SUPABASE_SERVICE_ROLE_KEY so inserts are not blocked.
 *   - Upsert: add UNIQUE on `post_id` for `.upsert(..., { onConflict: 'post_id' })`.
 *     Without it, use --insert-only (skips rows whose post_id already exists).
 *
 * Env (.env or .env.local at repo root):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RAPIDAPI_KEY
 *   RAPIDAPI_HOST (optional, default scraptik.p.rapidapi.com)
 *   SCRAPTIK_IMPORT_NOT_NULL_DEFAULTS (optional) JSON merged into each row for extra
 *   NOT NULL columns, e.g. {"sms":"yes","other_flag":1}
 *
 * Usage:
 *   node scripts/import-scraptik-user-posts.mjs <tiktok_user_id> [options]
 *   npm run import:scraptik -- <tiktok_user_id> ...
 *   <tiktok_user_id> is the same value as accounts.tiktok_id (decimal string if very large).
 *
 * Options:
 *   --campaign=<string>   default ""
 *   --region=<code>       default GB
 *   --count=<n>           page size (default 50)
 *   --max-pages=<n>       cap pagination (default unlimited)
 *   --dry-run             print rows, do not write
 *   --insert-only         insert new post_ids only (no upsert); no UNIQUE required
 *   --delay-ms=<n>        pause between RapidAPI pages (default 600)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const RAPIDAPI_HOST_DEFAULT = "scraptik.p.rapidapi.com";

/** NOT NULL columns on social_media_data not sourced from Scraptik (types must match Postgres). */
const SOCIAL_MEDIA_DATA_NOT_NULL_DEFAULTS = {
  ["interface"]: "yes",
  /** integer NOT NULL — 1 = enabled / yes */
  dms: 1,
};

/**
 * Merges built-in NOT NULL defaults with optional env JSON (after loadDotEnv).
 * @returns {Record<string, string | number | boolean>}
 */
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
 * @param {Record<string, unknown>} aweme
 * @param {{ campaign: string; notNullDefaults: Record<string, string | number | boolean> }} opts
 */
function mapAwemeToRow(aweme, opts) {
  const stats = aweme.statistics && typeof aweme.statistics === "object" ? aweme.statistics : {};
  const play = Number(stats.play_count) || 0;
  const digg = Number(stats.digg_count) || 0;
  const comments = Number(stats.comment_count) || 0;
  const shares = Number(stats.share_count) || 0;
  const saves = Number(aweme.collect_stat) || 0;
  const shareUrl =
    typeof aweme.share_url === "string" && aweme.share_url
      ? aweme.share_url
      : aweme.share_info &&
          typeof aweme.share_info === "object" &&
          typeof aweme.share_info.share_url === "string"
        ? aweme.share_info.share_url
        : null;
  const createTime = Number(aweme.create_time) || 0;

  return {
    post_id: String(aweme.aweme_id ?? ""),
    date: createTime ? createTimeToDateString(createTime) : null,
    views: play,
    likes: digg,
    comments,
    shares,
    saves,
    platform: "tiktok",
    caption: typeof aweme.desc === "string" ? aweme.desc : "",
    campaign: opts.campaign,
    cost: null,
    links: shareUrl,
    type: "video",
    ...opts.notNullDefaults,
  };
}

function validateRow(row) {
  if (!row.post_id) return "missing aweme_id/post_id";
  if (!row.date) return "missing date from create_time";
  if (!row.links) return "missing share_url (links)";
  return null;
}

async function fetchUserPostsPage(userId, { count, maxCursor, region, apiKey, host }) {
  const url = new URL(`https://${host}/user-posts`);
  /** TikTok user ids can exceed Number.MAX_SAFE_INTEGER — always send as string. */
  url.searchParams.set("user_id", String(userId));
  url.searchParams.set("count", String(count));
  url.searchParams.set("max_cursor", String(maxCursor));
  url.searchParams.set("region", region);

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

  if (json.status_code !== undefined && json.status_code !== 0) {
    throw new Error(`RapidAPI status_code=${json.status_code}: ${JSON.stringify(json).slice(0, 500)}`);
  }

  return json;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadDotEnv();
  const notNullDefaults = mergedNotNullDefaults();

  const { positional, flags } = parseArgs(process.argv.slice(2));
  const userId =
    positional[0] != null ? String(positional[0]).trim() : "";

  if (!userId) {
    console.error(
      "Usage: node scripts/import-scraptik-user-posts.mjs <tiktok_user_id> [--campaign=] [--region=GB] [--count=50] [--max-pages=N] [--dry-run] [--insert-only] [--delay-ms=600]"
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rapidKey = process.env.RAPIDAPI_KEY;
  const rapidHost = process.env.RAPIDAPI_HOST || RAPIDAPI_HOST_DEFAULT;

  const campaign = flagString(flags, "campaign", "");
  const region = flagString(flags, "region", "GB");
  const count = flagNumber(flags, "count", 50);
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

  console.error(`Scraptik user-posts user_id=${userId}`);

  let maxCursor = 0;
  const allRows = [];

  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await sleep(delayMs);

    const json = await fetchUserPostsPage(userId, {
      count,
      maxCursor,
      region,
      apiKey: rapidKey,
      host: rapidHost,
    });

    const list = Array.isArray(json.aweme_list) ? json.aweme_list : [];
    for (const aweme of list) {
      const row = mapAwemeToRow(aweme, { campaign, notNullDefaults });
      const err = validateRow(row);
      if (err) {
        console.warn(`Skip aweme (validation): ${err}`, aweme.aweme_id);
        continue;
      }
      allRows.push(row);
    }

    const hasMore = json.has_more === 1 || json.has_more === true;
    const nextCursor = json.max_cursor;
    console.error(
      `Page ${page}: fetched ${list.length} items, has_more=${hasMore}, max_cursor=${nextCursor}`
    );

    if (!hasMore || nextCursor === undefined || nextCursor === null || nextCursor === "") {
      break;
    }
    maxCursor = nextCursor;
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
      console.error(`Chunk ${i / chunkSize + 1}: inserted ${toInsert.length} (skipped ${chunk.length - toInsert.length})`);
    } else {
      const { error } = await supabase.from("social_media_data").upsert(chunk, {
        onConflict: "post_id",
      });
      if (error) {
        console.error("Upsert failed:", error.message);
        console.error(
          "Hint: add UNIQUE (post_id) on social_media_data, or run with --insert-only for new rows only."
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
