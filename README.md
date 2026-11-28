# Olvik Labs B2B, Financial & Developer Intelligence MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![MCP SDK](https://img.shields.io/badge/%40modelcontextprotocol%2Fsdk-1.12%2B-2563eb)](./package.json)
[![Publisher: Olvik Labs](https://img.shields.io/badge/Publisher-Olvik%20Labs-0f172a)](https://olviklabs.com)

An open-source **TypeScript Model Context Protocol (`@modelcontextprotocol/sdk`) stdio server** (`src/index.ts`) providing **8 read-only intelligence tools** for **Claude Desktop, Claude Code, Cursor, Windsurf, Cline, and Glama**:

1. **`extract_sec_edgar_filings`** — Official US SEC EDGAR `10-K`, `10-Q`, `8-K`, & `Form 4` filings by stock ticker.
2. **`analyze_saas_pricing`** — B2B SaaS `/pricing` tier detector, price-point extractor & SHA-256 change hash.
3. **`search_government_tenders`** — Official World Bank Global & UK Contracts Finder (OCDS) RFP procurement search.
4. **`analyze_appstore_aso`** — Apple iOS & Mac App Store keyword rankings, ratings & versions across 40+ storefronts.
5. **`extract_llm_rag_docs`** — Clean technical documentation & `llms.txt` extractor for RAG context injection.
6. **`analyze_chrome_extension`** — Chrome Web Store install counts, ratings & micro-SaaS opportunity analysis.
7. **`mine_wordpress_plugin_churn`** — Official WordPress.org Plugin Directory installs & 1–2 star churn ratios.
8. **`get_bluesky_author_feed`** — Public Bluesky AT Protocol author feed & engagement metrics.

---

## Architecture: Zero-Key Local Mode + Optional Cloud Scale

- **Zero-Key Standalone Execution (Default):** Works immediately out of the box over `stdio` (`node dist/index.js` or Docker) with **zero API keys required**, querying official public endpoints (`data.sec.gov`, `itunes.apple.com`, `api.wordpress.org`, `search.worldbank.org`, `public.api.bsky.app`) directly.
- **Optional Cloud Batch Scaling (`APIFY_TOKEN`):** Set `APIFY_TOKEN` in `env` to automatically offload large multi-company XBRL financial runs, multi-page sitemap crawls, and multi-country App Store review mining to Olvik Labs' cloud [Apify Actors](https://apify.com/olviklabs).

---

## Quick 1-Line `npx` Installation (Claude Desktop, Cursor & Windsurf)

Add directly to `claude_desktop_config.json` or `.cursor/mcp.json` — **zero `git clone` or API keys required** for instant 2-row local previews (add your optional `APIFY_TOKEN` to unlock full cloud dataset batch runs):

```json
{
  "mcpServers": {
    "olviklabs-b2b-intelligence": {
      "command": "npx",
      "args": ["-y", "olviklabs-b2b-mcp-servers"],
      "env": {
        "APIFY_TOKEN": ""
      }
    }
  }
}
```

*(Published on npm as [`olviklabs-b2b-mcp-servers`](https://www.npmjs.com/package/olviklabs-b2b-mcp-servers); `github:yashik1991/olviklabs-b2b-mcp-servers` is also supported.)*

### Option 2: Build from Source or Docker
```bash
git clone https://github.com/yashik1991/olviklabs-b2b-mcp-servers.git
cd olviklabs-b2b-mcp-servers
npm install && npm run build
```

### Option 2: Run via Docker
```bash
docker build -t olviklabs-b2b-mcp .
docker run -i --rm olviklabs-b2b-mcp
```

---

## Cloud Actors & Extended Dataset Runs
For scheduled cloud pipelines, n8n/Make workflows, or large batch runs, each tool also has a dedicated cloud Actor maintained by [Olvik Labs on Apify Store](https://apify.com/olviklabs):
- [`olviklabs/sec-edgar-filing-intelligence`](https://apify.com/olviklabs/sec-edgar-filing-intelligence)
- [`olviklabs/saas-pricing-intelligence`](https://apify.com/olviklabs/saas-pricing-intelligence)
- [`olviklabs/gov-tenders-intelligence`](https://apify.com/olviklabs/gov-tenders-intelligence)
- [`olviklabs/appstore-aso-review-intelligence`](https://apify.com/olviklabs/appstore-aso-review-intelligence)
- [`olviklabs/llm-docs-rag-extractor`](https://apify.com/olviklabs/llm-docs-rag-extractor)
- [`olviklabs/chrome-extension-analyzer`](https://apify.com/olviklabs/chrome-extension-analyzer)
- [`olviklabs/wordpress-plugin-intelligence`](https://apify.com/olviklabs/wordpress-plugin-intelligence)
- [`olviklabs/bluesky-brand-intelligence`](https://apify.com/olviklabs/bluesky-brand-intelligence)

---

## License
MIT © [Olvik Labs](https://olviklabs.com) (`support@olviklabs.com`)
