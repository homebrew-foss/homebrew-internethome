#!/usr/bin/env node

const fs = require("fs");

const SITES_JSON = "./src/data/sites.json";

let failed = 0;
let passed = 0;
let unreachable = 0;
let total = 0;
const failedSites = [];
const unreachableSites = [];

async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HomebrewWebringValidator/1.0; +https://homebrew.hsp-ec.xyz/webring)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status}` };
    }

    if (res.headers.get("cf-mitigated") === "challenge") {
      return { ok: false, reason: "blocked by Cloudflare challenge" };
    }

    const html = await res.text();
    if (/<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(html)) {
      return { ok: false, reason: "blocked by Cloudflare challenge" };
    }

    return { ok: true, html };
  } catch (err) {
    return { ok: false, reason: err.name === "TimeoutError" ? "timeout" : err.message };
  }
}

function normalizeHtml(html) {
  return html.replace(/\n/g, " ").replace(/\s+/g, " ");
}

function hasWebringLinks(html) {
  const normalized = normalizeHtml(html);

  // Match exact pattern: href="https://homebrew.hsp-ec.xyz/ring/prev?site=https://..."
  const prevRegex =
    /href="https:\/\/homebrew\.hsp-ec\.xyz\/ring\/prev\?site=https:\/\/[^"]+"/i;
  const nextRegex =
    /href="https:\/\/homebrew\.hsp-ec\.xyz\/ring\/next\?site=https:\/\/[^"]+"/i;
  const randomRegex =
    /href="https:\/\/homebrew\.hsp-ec\.xyz\/ring\/random\?site=https:\/\/[^"]+"/i;

  const hasPrev = prevRegex.test(normalized);
  const hasNext = nextRegex.test(normalized);
  const hasRandom = randomRegex.test(normalized);

  return { hasPrev, hasNext, hasRandom };
}

async function validateWebring() {
  const sitesData = JSON.parse(fs.readFileSync(SITES_JSON, "utf8"));
  const sites = sitesData.ring[0].sites;

  total = sites.length;

  for (const site of sites) {
    const siteUrl = site.url;
    const result = await fetchUrl(siteUrl);

    if (!result.ok) {
      console.log(`⚠️  ${siteUrl} - Could not fetch (${result.reason})`);
      console.log("");
      unreachable++;
      unreachableSites.push(siteUrl);
      continue;
    }

    const { hasPrev, hasNext, hasRandom } = hasWebringLinks(result.html);

    if (hasPrev && hasNext) {
      if (hasRandom) {
        console.log(
          `[OK] ${siteUrl} - Webring links valid (prev + next + random)`,
        );
      } else {
        console.log(`[OK] ${siteUrl} - Webring links valid (prev + next)`);
      }
      passed++;
    } else {
      console.log(`[ERR] ${siteUrl} - Webring links NOT found or invalid`);
      console.log("   [NEED] prev and next links");
      failed++;
      failedSites.push(siteUrl);
    }
  }

  console.log("");
  console.log("========================================");
  console.log(`Total sites: ${total}`);
  console.log(`Valid: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Unreachable: ${unreachable}`);
  console.log("=========================================");
  console.log("");

  if (unreachable > 0) {
    console.log("[WARN] Unreachable sites (may be temporary):");
    unreachableSites.forEach((site) => console.log(`   - ${site}`));
    console.log("");
  }

  if (failed > 0) {
    console.log("[ERR] Sites missing webring implementation:");
    failedSites.forEach((site) => console.log(`   - ${site}`));
    console.log("");
    console.log("[NEED] Required HTML snippet for each site footer:");
    console.log("");
    console.log('<div class="webring-section">');
    console.log('  <div class="webring-header">');
    console.log(
      '    <h3><a href="https://homebrew.hsp-ec.xyz/webring">Homebrew Webring</a></h3>',
    );
    console.log("  </div>");
    console.log('  <div class="webring-nav">');
    console.log(
      '    <a href="https://homebrew.hsp-ec.xyz/ring/prev?site=YOUR_SITE_URL">← Previous</a>',
    );
    console.log(
      '    <a href="https://homebrew.hsp-ec.xyz/ring/random?site=YOUR_SITE_URL">🔀 Random</a>',
    );
    console.log(
      '    <a href="https://homebrew.hsp-ec.xyz/ring/next?site=YOUR_SITE_URL">Next →</a>',
    );
    console.log("  </div>");
    console.log("</div>");
    console.log("");
    process.exit(1);
  }

  process.exit(0);
}

validateWebring().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
