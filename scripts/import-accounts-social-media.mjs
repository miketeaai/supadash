#!/usr/bin/env node
/**
 * For each row in `accounts` on the chosen Supabase project, run:
 *   - import-instagram-reels.mjs when `ig_id` is set
 *   - import-scraptik-user-posts.mjs when `tiktok_id` is set
 *
 * Child scripts use SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment;
 * this orchestrator overrides those to match --profile (same mapping as import-tiktok-account).
 *
 * Env (after loadDotEnv): RAPIDAPI_KEY for children; profile-specific Supabase vars below.
 *
 * Usage:
 *   node scripts/import-accounts-social-media.mjs --profile=peako
 *   node scripts/import-accounts-social-media.mjs --profile=sway --campaign=organic --max-pages=2
 *   npm run import:accounts-social-media -- --profile=peako --dry-run
 *
 * Options
 *   --profile=main|sway|peako   required — which `accounts` table to read and which DB children write to
 *   --continue-on-error          keep going if a child exits non-zero (default: stop on first failure)
 *   --dry-run                    passed through to both importers
 *   --insert-only                passed through
 *   --campaign=, --count=, --max-pages=, --delay-ms=   passed through to both where applicable
 *   --region=                    passed only to Scraptik importer (default GB inside that script)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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
 * @param {string} raw
 * @returns {{ label: string; url: string; key: string }}
 */
function resolveSupabaseProfile(raw) {
  const p = String(raw || "").toLowerCase().trim();
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

/** @param {Map<string, true | string>} flags */
function forwardSharedImporterFlags(flags) {
  const out = [];
  const keys = ["campaign", "count", "max-pages", "delay-ms", "dry-run", "insert-only"];
  for (const k of keys) {
    if (!flags.has(k)) continue;
    const v = flags.get(k);
    if (v === true) out.push(`--${k}`);
    else if (v !== undefined && v !== "") out.push(`--${k}=${v}`);
  }
  return out;
}

/** @param {Map<string, true | string>} flags */
function forwardScraptikOnlyFlags(flags) {
  const out = [];
  if (flags.has("region")) {
    const v = flags.get("region");
    if (v !== true && v !== undefined && v !== "") out.push(`--region=${v}`);
  }
  return out;
}

/**
 * @param {{ tiktok_id?: unknown }} row
 * @returns {string | null}
 */
function tiktokUserIdFromAccountRow(row) {
  if (row.tiktok_id == null) return null;
  if (typeof row.tiktok_id === "bigint") {
    const s = row.tiktok_id.toString();
    return s !== "0" ? s : null;
  }
  const s = String(row.tiktok_id).trim();
  if (s === "" || s === "0") return null;
  if (!/^\d+$/.test(s)) return null;
  return s;
}

function spawnImporter(scriptName, args, env, { continueOnError }) {
  const scriptPath = resolve(__dirname, scriptName);
  console.error(`\n→ ${[process.execPath, scriptPath, ...args].join(" ")}`);
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    env,
    cwd: process.cwd(),
  });
  if (r.status !== 0 && r.error) {
    console.error(r.error);
  }
  if (r.status !== 0 && !continueOnError) {
    process.exit(r.status ?? 1);
  }
  return r.status === 0;
}

async function main() {
  loadDotEnv();
  const { flags } = parseArgs(process.argv.slice(2));

  const profileRaw = flagString(flags, "profile", "");
  const continueOnError = flagBool(flags, "continue-on-error");

  if (!profileRaw) {
    console.error(
      "Usage: node scripts/import-accounts-social-media.mjs --profile=main|sway|peako [options]\n" +
        "  Forwards: --campaign --count --max-pages --delay-ms --dry-run --insert-only --region (Scraptik only)\n" +
        "  --continue-on-error  keep going after a failed child",
    );
    process.exit(1);
  }

  let target;
  try {
    target = resolveSupabaseProfile(profileRaw);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  if (!process.env.RAPIDAPI_KEY) {
    console.error("Missing RAPIDAPI_KEY (required by child importers).");
    process.exit(1);
  }

  const shared = forwardSharedImporterFlags(flags);
  const scraptikExtra = forwardScraptikOnlyFlags(flags);

  const childEnv = {
    ...process.env,
    SUPABASE_URL: target.url,
    NEXT_PUBLIC_SUPABASE_URL: target.url,
    SUPABASE_SERVICE_ROLE_KEY: target.key,
  };

  const supabase = createClient(target.url, target.key);
  console.error(`Listing accounts (profile=${target.label}) …`);

  const { data: rows, error } = await supabase
    .from("accounts")
    .select("id, username, ig_id, tiktok_id")
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to read accounts:", error.message);
    process.exit(1);
  }

  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    console.error("No account rows found.");
    return;
  }

  console.error(`Found ${list.length} account row(s).`);

  for (const row of list) {
    const label =
      row.username != null
        ? String(row.username)
        : row.id != null
          ? `id=${row.id}`
          : "(row)";
    console.error(`\n--- Account ${label} ---`);

    const igId =
      row.ig_id != null && String(row.ig_id).trim() !== "" ? String(row.ig_id).trim() : null;
    /** Scraptik `user_id` must match DB `tiktok_id` exactly; never use Number() (unsafe above 2^53-1). */
    const tiktokId = tiktokUserIdFromAccountRow(row);

    if (!igId && !tiktokId) {
      console.error("Skip: no ig_id and no tiktok_id.");
      continue;
    }

    if (igId) {
      const ok = spawnImporter(
        "import-instagram-reels.mjs",
        [igId, ...shared],
        childEnv,
        { continueOnError },
      );
      if (!ok && !continueOnError) return;
    }

    if (tiktokId) {
      const ok = spawnImporter(
        "import-scraptik-user-posts.mjs",
        [tiktokId, ...shared, ...scraptikExtra],
        childEnv,
        { continueOnError },
      );
      if (!ok && !continueOnError) return;
    }
  }

  console.error("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
