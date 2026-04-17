#!/usr/bin/env node
/**
 * Upsert one `accounts` row from Scraptik GET /get-user?region=…
 *   - With --sec-user-id: adds sec_user_id (response includes sec_uid).
 *   - Otherwise: username=<handle>&region=… (RapidAPI Scraptik get-user; TikTok handle, e.g. peakoapp).
 * Maps accounts.tiktok_id from user.user_id when present, else user.uid, as a **decimal string**
 * (never Number()) so values above Number.MAX_SAFE_INTEGER survive into Postgres bigint.
 *
 * Env — RapidAPI: RAPIDAPI_KEY; optional SCRAPTIK_HOST (default scraptik.p.rapidapi.com)
 *
 * Env — Supabase (pick with --profile):
 *   main | sway  → SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Sway / primary)
 *   peako        → PEAKO_NEXT_PUBLIC_SUPABASE_URL or PEAKO_SUPABASE_URL, PEAKO_SUPABASE_SERVICE_ROLE_KEY
 *
 * Upsert requires UNIQUE on accounts(tiktok_id). Use --insert-only if you have no unique yet.
 *
 * Usage:
 *   node scripts/import-tiktok-account.mjs --username=javan [--profile=main|sway|peako]
 *   node scripts/import-tiktok-account.mjs --sec-user-id=MS4wLjABAAAA... [--region=GB]
 *   npm run import:tiktok-account -- --username=javan --profile=sway
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SCRAPTIK_HOST_DEFAULT = "scraptik.p.rapidapi.com";
const TABLE = "accounts";

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

function flagBool(flags, key) {
  return flags.get(key) === true || flags.get(key) === "";
}

/**
 * @param {string} raw --profile value
 * @returns {{ label: string; url: string; key: string }}
 */
function resolveSupabaseProfile(raw) {
  const p = String(raw || "main").toLowerCase().trim();
  if (p === "peako") {
    const url =
      process.env.PEAKO_NEXT_PUBLIC_SUPABASE_URL || process.env.PEAKO_SUPABASE_URL;
    const key = process.env.PEAKO_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Profile peako: set PEAKO_NEXT_PUBLIC_SUPABASE_URL (or PEAKO_SUPABASE_URL) and PEAKO_SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return { label: "peako", url, key };
  }
  if (p === "main" || p === "sway") {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Profile main/sway: set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return { label: p === "sway" ? "sway" : "main", url, key };
  }
  throw new Error(`Unknown --profile "${raw}". Use main, sway, or peako.`);
}

/**
 * @param {{ apiKey: string; host: string; region: string; secUserId?: string; tiktokUsername?: string }} opts
 */
async function fetchScraptikGetUser({ apiKey, host, region, secUserId, tiktokUsername }) {
  const url = new URL(`https://${host}/get-user`);
  url.searchParams.set("region", region);
  if (secUserId) {
    url.searchParams.set("sec_user_id", secUserId);
  } else if (tiktokUsername) {
    url.searchParams.set("username", tiktokUsername);
  } else {
    throw new Error("fetchScraptikGetUser: pass secUserId or tiktokUsername");
  }

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
    throw new Error(`Scraptik non-JSON (${res.status}): ${text.slice(0, 400)}`);
  }

  if (!res.ok) {
    throw new Error(`Scraptik HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  return json;
}

/**
 * TikTok user ids can exceed 2^53-1. Prefer string from API; only use safe integers as numbers.
 * @param {unknown} value
 * @returns {string | null}
 */
function tiktokIdDecimalString(value) {
  if (value == null) return null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (!Number.isSafeInteger(value)) return null;
    const t = String(Math.trunc(value));
    return t !== "0" ? t : null;
  }
  const s = String(value).trim();
  if (!/^\d+$/.test(s) || s === "0") return null;
  return s;
}

/**
 * Scraptik user.user_id matches TikTok id for DB column tiktok_id; fall back to uid.
 * @param {Record<string, unknown>} user
 */
function mapTiktokRow(user) {
  const tiktokId =
    tiktokIdDecimalString(user.user_id) ?? tiktokIdDecimalString(user.uid);

  const secUid = typeof user.sec_uid === "string" ? user.sec_uid : null;
  const uniqueId = typeof user.unique_id === "string" ? user.unique_id : null;

  const followerCount =
    typeof user.follower_count === "number" && user.follower_count >= 0
      ? user.follower_count
      : 0;
  const totalFavorited =
    typeof user.total_favorited === "number" && user.total_favorited >= 0
      ? user.total_favorited
      : 0;

  const aweme =
    typeof user.aweme_count === "number"
      ? user.aweme_count
      : typeof user.visible_videos_count === "number"
        ? user.visible_videos_count
        : 0;

  const favoriting =
    typeof user.favoriting_count === "number" && user.favoriting_count >= 0
      ? user.favoriting_count
      : 0;

  let engagement = 0;
  if (followerCount > 0 && totalFavorited >= 0) {
    engagement = Math.round((totalFavorited / followerCount) * 10000) / 10000;
  }

  let avatarUrl = null;
  const larger = user.avatar_larger;
  if (larger && typeof larger === "object" && Array.isArray(larger.url_list) && larger.url_list[0]) {
    avatarUrl = String(larger.url_list[0]);
  } else if (
    user.avatar_medium &&
    typeof user.avatar_medium === "object" &&
    Array.isArray(user.avatar_medium.url_list) &&
    user.avatar_medium.url_list[0]
  ) {
    avatarUrl = String(user.avatar_medium.url_list[0]);
  }

  return {
    ig_id: null,
    username: uniqueId,
    followers: followerCount,
    likes: totalFavorited,
    saves: favoriting,
    videos: aweme,
    character_type: typeof user.category === "string" ? user.category : null,
    avatar_url: avatarUrl,
    tiktok_id: tiktokId,
    tiktok_secid: secUid,
    tik_tok_engagement_rate: engagement,
  };
}

async function insertOnlyIfMissing(supabase, row, keyCol) {
  const keyVal = row[keyCol];
  if (keyVal == null) return { skipped: true, reason: `missing ${keyCol}` };

  const { data: existing, error: selErr } = await supabase
    .from(TABLE)
    .select(keyCol)
    .eq(keyCol, keyVal)
    .maybeSingle();

  if (selErr) {
    return { error: selErr.message };
  }
  if (existing) {
    return { skipped: true, reason: `${keyCol} already exists` };
  }

  const { error } = await supabase.from(TABLE).insert(row);
  if (error) return { error: error.message };
  return { inserted: true };
}

function resolveUsername(flags, positional) {
  const fromFlag = flagString(flags, "username", "").replace(/^@/, "");
  if (fromFlag) return fromFlag;
  const p = positional[0];
  if (p) return String(p).replace(/^@/, "");
  return "";
}

async function main() {
  loadDotEnv();
  const { positional, flags } = parseArgs(process.argv.slice(2));

  const username = resolveUsername(flags, positional);
  const secUserId = flagString(flags, "sec-user-id", "").trim();
  const profileRaw = flagString(flags, "profile", "main");
  const region = flagString(flags, "region", "GB");
  const dryRun = flagBool(flags, "dry-run");
  const insertOnly = flagBool(flags, "insert-only");

  if (!username && !secUserId) {
    console.error(
      "Usage: node scripts/import-tiktok-account.mjs --username=<tiktok_handle> [--profile=main|sway|peako]\n       node scripts/import-tiktok-account.mjs --sec-user-id=MS4wLjAB... [--region=GB] [--profile=peako]\n       (username OR sec-user-id required)",
    );
    process.exit(1);
  }

  const rapidKey = process.env.RAPIDAPI_KEY;
  const scraptikHost = process.env.SCRAPTIK_HOST || SCRAPTIK_HOST_DEFAULT;

  if (!rapidKey) {
    console.error("Missing RAPIDAPI_KEY");
    process.exit(1);
  }

  if (secUserId) {
    console.error(`Fetching TikTok user (sec_user_id=…, region=${region}) …`);
  } else {
    console.error(`Fetching TikTok user (username=${username}, region=${region}) …`);
  }

  const json = await fetchScraptikGetUser({
    apiKey: rapidKey,
    host: scraptikHost,
    region,
    secUserId: secUserId || undefined,
    tiktokUsername: !secUserId && username ? username : undefined,
  });

  if (json.status_code !== 0 || !json.user || typeof json.user !== "object") {
    console.error(
      "Scraptik get-user failed:",
      `status_code=${json.status_code}`,
      json.status_msg != null ? String(json.status_msg) : "",
    );
    process.exit(1);
  }

  const row = mapTiktokRow(/** @type {Record<string, unknown>} */ (json.user));
  if (row.tiktok_id == null) {
    console.error("Response missing user.user_id / user.uid; aborting.");
    process.exit(1);
  }

  if (dryRun) {
    console.log(JSON.stringify({ profile: profileRaw, row }, null, 2));
    return;
  }

  let supabaseTarget;
  try {
    supabaseTarget = resolveSupabaseProfile(profileRaw);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  console.error(`Supabase profile: ${supabaseTarget.label}`);
  const supabase = createClient(supabaseTarget.url, supabaseTarget.key);

  if (insertOnly) {
    const result = await insertOnlyIfMissing(supabase, row, "tiktok_id");
    if ("error" in result && result.error) {
      console.error("Insert failed:", result.error);
      process.exit(1);
    }
    if (result.skipped) {
      console.error(result.reason);
    } else {
      console.error("Inserted.");
    }
    return;
  }

  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: "tiktok_id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    console.error("Hint: add UNIQUE on accounts(tiktok_id), or use --insert-only.");
    process.exit(1);
  }
  console.error("Upserted tiktok_id=", row.tiktok_id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
