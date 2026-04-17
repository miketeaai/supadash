#!/usr/bin/env node
/**
 * Upsert one `accounts` row from Instagram (instagram-looter2 profile).
 * Only `ig_id` is read from the API; `username` is your CLI handle; other columns are defaults.
 *
 * Env — RapidAPI: RAPIDAPI_KEY; optional RAPIDAPI_HOST (default instagram-looter2.p.rapidapi.com)
 *
 * Env — Supabase (pick with --profile):
 *   main | sway  → SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Sway / primary)
 *   peako        → PEAKO_NEXT_PUBLIC_SUPABASE_URL or PEAKO_SUPABASE_URL, PEAKO_SUPABASE_SERVICE_ROLE_KEY
 *
 * Upsert requires UNIQUE on accounts(ig_id). Use --insert-only if you have no unique yet.
 *
 * Usage:
 *   node scripts/import-instagram-account.mjs --username=javan [--profile=main|sway|peako]
 *   node scripts/import-instagram-account.mjs javan --profile=peako
 *   npm run import:instagram-account -- --username=javan --profile=sway
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const IG_HOST_DEFAULT = "instagram-looter2.p.rapidapi.com";
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

async function fetchInstagramProfile(username, { apiKey, host }) {
  const url = new URL(`https://${host}/profile`);
  url.searchParams.set("username", username.replace(/^@/, ""));

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
    throw new Error(`Instagram API non-JSON (${res.status}): ${text.slice(0, 400)}`);
  }

  if (!res.ok) {
    throw new Error(`Instagram API HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  if (json.status !== true) {
    throw new Error(
      `Instagram profile failed (status not true): ${JSON.stringify(json).slice(0, 500)}`,
    );
  }

  return json;
}

function mapInstagramRow(profile, cliUsername) {
  const igId = profile.id != null ? String(profile.id) : null;

  return {
    ig_id: igId,
    username: cliUsername || null,
    followers: 0,
    likes: 0,
    saves: 0,
    videos: 0,
    character_type: null,
    avatar_url: null,
    tiktok_id: null,
    tiktok_secid: null,
    tik_tok_engagement_rate: 0,
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
  const profileRaw = flagString(flags, "profile", "main");
  const dryRun = flagBool(flags, "dry-run");
  const insertOnly = flagBool(flags, "insert-only");

  if (!username) {
    console.error(
      "Usage: node scripts/import-instagram-account.mjs --username=<handle> [--profile=main|sway|peako]\n       node scripts/import-instagram-account.mjs <handle> [--dry-run] [--insert-only] [--profile=peako]",
    );
    process.exit(1);
  }

  const rapidKey = process.env.RAPIDAPI_KEY;
  const igHost = process.env.RAPIDAPI_HOST || IG_HOST_DEFAULT;

  if (!rapidKey) {
    console.error("Missing RAPIDAPI_KEY");
    process.exit(1);
  }

  console.error(`Fetching Instagram profile: @${username} …`);
  const igJson = await fetchInstagramProfile(username, { apiKey: rapidKey, host: igHost });
  const row = mapInstagramRow(igJson, username);
  if (!row.ig_id) {
    console.error("Instagram response missing id; aborting.");
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
    const result = await insertOnlyIfMissing(supabase, row, "ig_id");
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

  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: "ig_id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    console.error("Hint: add UNIQUE on accounts(ig_id), or use --insert-only.");
    process.exit(1);
  }
  console.error("Upserted ig_id=", row.ig_id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
