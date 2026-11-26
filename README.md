# Olvik Labs — B2B, Financial & Developer Intelligence MCP Servers

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![MCP Ready](https://img.shields.io/badge/MCP-Streamable%20HTTP%20%2F%20SSE-2563eb)](https://mcp.apify.com)
[![Publisher: Olvik Labs](https://img.shields.io/badge/Publisher-Olvik%20Labs-0f172a)](https://apify.com/olviklabs)

Zero-install **Model Context Protocol (MCP)** tools for **Claude Desktop, Claude Code, Cursor, Windsurf, Cline, n8n, and LangChain** — powered by official public APIs and clean Markdown extractors hosted on [Apify MCP (`mcp.apify.com`)](https://apify.com/olviklabs).

---

## Included MCP Tools (8 Production Servers)

| MCP Tool / Actor | Primary Data Source | Key Output for AI Agents | Apify Store & Docs |
| :--- | :--- | :--- | :--- |
| **[SEC EDGAR Filings & XBRL Financials](https://apify.com/olviklabs/sec-edgar-filing-intelligence)** | Official US SEC EDGAR (`data.sec.gov`) | `10-K`, `10-Q`, `8-K`, `Form 4` + latest GAAP Revenue, Net Income, Cash, Assets | [`olviklabs/sec-edgar-filing-intelligence`](https://apify.com/olviklabs/sec-edgar-filing-intelligence) |
| **[SaaS Pricing & Plan Change Tracker](https://apify.com/olviklabs/saas-pricing-intelligence)** | B2B SaaS `/pricing` pages | Plan tiers, price points, free-tier/enterprise flags, SHA-256 change hash & Markdown | [`olviklabs/saas-pricing-intelligence`](https://apify.com/olviklabs/saas-pricing-intelligence) |
| **[Public Government Tenders & RFPs](https://apify.com/olviklabs/gov-tenders-intelligence)** | UK Contracts Finder (OCDS) + World Bank (140+ countries) | Open RFP titles, GBP/USD contract budgets, buyer emails, CPV codes & deadlines | [`olviklabs/gov-tenders-intelligence`](https://apify.com/olviklabs/gov-tenders-intelligence) |
| **[App Store ASO & Multi-Country Reviews](https://apify.com/olviklabs/appstore-aso-review-intelligence)** | Apple iTunes Search & Storefront RSS (40+ countries) | iOS & Mac App Store keyword rankings, versions, and 1–2 star competitor reviews | [`olviklabs/appstore-aso-review-intelligence`](https://apify.com/olviklabs/appstore-aso-review-intelligence) |
| **[LLM / RAG Clean Docs & `llms.txt` Extractor](https://apify.com/olviklabs/llm-docs-rag-extractor)** | `llms.txt`, `sitemap.xml` & technical docs | Deduplicated, token-sized Markdown chunks with YAML frontmatter for RAG | [`olviklabs/llm-docs-rag-extractor`](https://apify.com/olviklabs/llm-docs-rag-extractor) |
| **[Chrome Web Store Opportunity Analyzer](https://apify.com/olviklabs/chrome-extension-analyzer)** | Chrome Web Store listings | Active user counts, star ratings, days since update & 0–100 Micro-SaaS Score | [`olviklabs/chrome-extension-analyzer`](https://apify.com/olviklabs/chrome-extension-analyzer) |
| **[WordPress Plugin Churn & Review Miner](https://apify.com/olviklabs/wordpress-plugin-intelligence)** | Official WordPress.org Plugin API (60k+ plugins) | Active installs, 1–2 star complaint ratio, unresolved support & review snippets | [`olviklabs/wordpress-plugin-intelligence`](https://apify.com/olviklabs/wordpress-plugin-intelligence) |
| **[Bluesky / AT Protocol Brand Intelligence](https://apify.com/olviklabs/bluesky-brand-intelligence)** | Official AT Protocol (`public.api.bsky.app`) | Public brand mentions, influencer posts, engagement metrics & LLM Markdown | [`olviklabs/bluesky-brand-intelligence`](https://apify.com/olviklabs/bluesky-brand-intelligence) |

---

## Quickstart: Connect to Claude Desktop, Cursor, or Windsurf (Zero Local Install)

1. Grab a free API token at [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations).
2. Paste into your `.cursor/mcp.json` or `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "olviklabs-b2b-intelligence": {
      "url": "https://mcp.apify.com/?actors=olviklabs/sec-edgar-filing-intelligence,olviklabs/saas-pricing-intelligence,olviklabs/gov-tenders-intelligence,olviklabs/appstore-aso-review-intelligence,olviklabs/llm-docs-rag-extractor,olviklabs/chrome-extension-analyzer,olviklabs/wordpress-plugin-intelligence,olviklabs/bluesky-brand-intelligence",
      "headers": {
        "Authorization": "Bearer YOUR_APIFY_API_TOKEN"
      }
    }
  }
}
```

*(Want only 1–2 tools in context? Pass just the comma-separated Actor slugs you need in `?actors=...`!)*

---

## Example Prompts Once Connected
- **Equity & FinTech Research:** *"Pull NVDA and MSFT's latest 10-K/10-Q filings and compare their latest GAAP revenue, net income, and cash balances."*
- **Competitive Intelligence:** *"Extract Linear, Asana, and Shortcut's current pricing pages and compare their per-seat tiers and enterprise gates."*
- **GovTech Deal Sourcing:** *"Find open UK government and World Bank software & cybersecurity tenders closing next month."*
- **Micro-SaaS Validation:** *"Check top Mac App Store apps for 'clipboard manager' across US, Germany, and Japan, plus 1–2 star user complaints."*

---

## Built By Olvik Labs
- **Creator Hub:** [apify.com/olviklabs](https://apify.com/olviklabs)
- **Website:** [olviklabs.com](https://olviklabs.com)
- **Support:** [support@olviklabs.com](mailto:support@olviklabs.com)
