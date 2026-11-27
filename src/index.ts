#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const USER_AGENT = 'OlvikLabs-B2B-MCP-Server/1.1 (support@olviklabs.com)';
const READ_ONLY_ANNOTATIONS = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
};

const MAX_FREE_PREVIEW_ITEMS = 2;

function hasApifyToken(): boolean {
    return Boolean(process.env.APIFY_TOKEN?.trim());
}

async function callApifyActor(actorSlug: string, input: Record<string, unknown>): Promise<unknown[]> {
    const token = process.env.APIFY_TOKEN!.trim();
    const url = `https://api.apify.com/v2/acts/olviklabs~${actorSlug}/run-sync-get-dataset-items?format=json`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Apify Cloud run HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const items = (await res.json()) as unknown[];
    return Array.isArray(items) ? items : [];
}

function wrapFreePreview(actorSlug: string, rawItems: unknown[]) {
    return {
        mode: 'free_local_preview',
        previewLimit: MAX_FREE_PREVIEW_ITEMS,
        upgradeToFullDataset: `Set APIFY_TOKEN in your MCP env (https://console.apify.com/settings/integrations) to unlock full cloud datasets, XBRL financials, review mining, and stateful diffs via https://apify.com/olviklabs/${actorSlug}`,
        items: rawItems.slice(0, MAX_FREE_PREVIEW_ITEMS),
    };
}

// ---------------- Local Direct Implementations (Zero-Auth Standalone Execution) ----------------

async function runSecEdgarLocal(tickers: string[], formTypes: string[], limit: number) {
    const dirRes = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!dirRes.ok) throw new Error(`SEC directory HTTP ${dirRes.status}`);
    const dir = (await dirRes.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
    const map = new Map<string, { cik10: string; title: string }>();
    for (const v of Object.values(dir)) {
        map.set(v.ticker.toUpperCase(), { cik10: String(v.cik_str).padStart(10, '0'), title: v.title });
    }

    const formsSet = new Set(formTypes.map((f) => f.toUpperCase()));
    const out: Record<string, unknown>[] = [];

    for (const raw of tickers.slice(0, 5)) {
        const sym = raw.trim().toUpperCase();
        const found = map.get(sym);
        if (!found) continue;
        const subRes = await fetch(`https://data.sec.gov/submissions/CIK${found.cik10}.json`, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        });
        if (!subRes.ok) continue;
        const sub = (await subRes.json()) as {
            name?: string;
            filings?: { recent?: { form: string[]; filingDate: string[]; accessionNumber: string[]; primaryDocument: string[] } };
        };
        const rec = sub.filings?.recent;
        if (!rec) continue;
        let count = 0;
        for (let i = 0; i < rec.form.length && count < limit; i++) {
            const f = rec.form[i].toUpperCase();
            if (formsSet.size > 0 && !formsSet.has(f)) continue;
            const accNoDash = rec.accessionNumber[i].replace(/-/g, '');
            out.push({
                ticker: sym,
                companyName: sub.name ?? found.title,
                form: f,
                filingDate: rec.filingDate[i],
                documentUrl: `https://www.sec.gov/Archives/edgar/data/${Number(found.cik10)}/${accNoDash}/${rec.primaryDocument[i]}`,
            });
            count++;
        }
    }
    return out;
}

async function runSaasPricingLocal(pricingUrls: string[]) {
    const out: Record<string, unknown>[] = [];
    for (const u of pricingUrls.slice(0, 5)) {
        const res = await fetch(u, { headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) continue;
        const html = await res.text();
        const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const prices = Array.from(
            new Set(text.match(/(?:\$|€|£|₹)\s?\d[\d,]*(?:\.\d{1,2})?/g) ?? []),
        ).slice(0, 15);
        const tiers = ['Free', 'Starter', 'Basic', 'Pro', 'Team', 'Business', 'Enterprise'].filter((t) =>
            new RegExp(`\\b${t}\\b`, 'i').test(text),
        );
        const fingerprint = createHash('sha256').update([...tiers, ...prices].join('|')).digest('hex').slice(0, 16);
        out.push({
            url: u,
            detectedPlans: tiers,
            detectedPrices: prices,
            hasFreeTier: /\bfree\b|\$0\b/i.test(text),
            pricingFingerprint: fingerprint,
            excerpt: text.slice(0, 1500),
        });
    }
    return out;
}

async function runGovTendersLocal(keywords: string[], limit: number) {
    const q = encodeURIComponent(keywords.join(' ') || 'software');
    const url = `https://search.worldbank.org/api/v2/procnotices?format=json&rows=${Math.min(limit, 20)}&qterm=${q}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`World Bank API HTTP ${res.status}`);
    const data = (await res.json()) as { procnotices?: Record<string, Record<string, unknown>> };
    return Object.values(data.procnotices ?? {})
        .filter((r) => r && typeof r === 'object' && r.id)
        .slice(0, limit)
        .map((r) => ({
            tenderId: String(r.id),
            country: String(r.countryshortname ?? 'Global'),
            title: String(r.bid_description ?? r.project_name ?? ''),
            projectName: String(r.project_name ?? ''),
            noticeType: String(r.notice_type ?? ''),
            deadlineDate: r.submission_date ?? null,
            url: r.url ?? `https://projects.worldbank.org/en/projects-operations/procurement-detail/${r.id}`,
        }));
}

async function runAppStoreAsoLocal(term: string, country: string, entity: string, limit: number) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${encodeURIComponent(country)}&entity=${encodeURIComponent(entity)}&limit=${Math.min(limit, 25)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`iTunes Search HTTP ${res.status}`);
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
    return (data.results ?? []).map((app, idx) => ({
        rank: idx + 1,
        country,
        trackId: app.trackId,
        name: app.trackName,
        seller: app.sellerName,
        price: app.price,
        averageUserRating: app.averageUserRating,
        userRatingCount: app.userRatingCount,
        version: app.version,
        url: app.trackViewUrl,
    }));
}

async function runLlmDocsLocal(targetUrl: string) {
    const res = await fetch(targetUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`Docs fetch HTTP ${res.status}`);
    const raw = await res.text();
    const clean = raw
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return [{ url: targetUrl, charCount: clean.length, previewExcerpt: clean.slice(0, 600) }];
}

async function runChromeExtensionLocal(extensionIdOrUrl: string) {
    const m = extensionIdOrUrl.match(/([a-p]{32})/i);
    if (!m) throw new Error('Provide a valid Chrome Web Store URL or 32-char extension ID.');
    const id = m[1].toLowerCase();
    const url = `https://chromewebstore.google.com/detail/_/${id}?hl=en`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? id).replace(/\s*-\s*Chrome Web Store.*$/i, '').trim();
    const users = html.match(/([\d,]+)\+?\s+users/i)?.[1] ?? null;
    return [{ extensionId: id, name: title, usersText: users, url }];
}

async function runWordPressChurnLocal(searchQuery: string, limit: number) {
    const url = `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[search]=${encodeURIComponent(searchQuery)}&request[per_page]=${Math.min(limit, 15)}&request[fields][active_installs]=1&request[fields][ratings]=1`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`WordPress.org API HTTP ${res.status}`);
    const data = (await res.json()) as { plugins?: Array<Record<string, unknown>> };
    return (data.plugins ?? []).map((p) => {
        const ratings = (p.ratings as Record<string, number> | undefined) ?? {};
        const total = Number(p.num_ratings ?? 0);
        const neg = Number(ratings['1'] ?? 0) + Number(ratings['2'] ?? 0);
        return {
            name: p.name,
            slug: p.slug,
            activeInstalls: p.active_installs,
            starRating: typeof p.rating === 'number' ? Number((p.rating / 20).toFixed(2)) : null,
            negativeReviewSharePct: total > 0 ? Number(((neg / total) * 100).toFixed(1)) : 0,
            lastUpdated: p.last_updated,
            url: `https://wordpress.org/plugins/${p.slug}/`,
        };
    });
}

async function runBlueskyFeedLocal(handle: string, limit: number) {
    const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=${Math.min(limit, 25)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`Bluesky AT Protocol HTTP ${res.status}`);
    const data = (await res.json()) as { feed?: Array<{ post?: Record<string, unknown> }> };
    return (data.feed ?? []).map((entry) => {
        const post = (entry.post ?? {}) as Record<string, unknown>;
        const record = (post.record ?? {}) as Record<string, unknown>;
        const author = (post.author ?? {}) as Record<string, unknown>;
        return {
            authorHandle: author.handle,
            text: record.text,
            createdAt: record.createdAt,
            likeCount: post.likeCount,
            repostCount: post.repostCount,
            replyCount: post.replyCount,
        };
    });
}

// ---------------- MCP Server Registration ----------------

const TOOLS = [
    {
        name: 'extract_sec_edgar_filings',
        description:
            'Fetch official US SEC EDGAR filings (10-K, 10-Q, 8-K, Form 4) and XBRL GAAP financial metrics by stock ticker.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                tickers: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'US stock tickers (e.g. ["AAPL", "NVDA"]).',
                },
                formTypes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'SEC form types filter (e.g. ["10-K", "10-Q", "8-K"]).',
                },
                maxFilingsPerCompany: {
                    type: 'number',
                    description: 'Maximum filings per company (1-25).',
                    default: 5,
                },
            },
            required: ['tickers'],
        },
    },
    {
        name: 'analyze_saas_pricing',
        description:
            'Extract B2B SaaS pricing tiers, price points, free-tier flags, and SHA-256 change-detection fingerprints from pricing URLs.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                pricingUrls: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Public SaaS pricing page URLs (e.g. ["https://linear.app/pricing"]).',
                },
            },
            required: ['pricingUrls'],
        },
    },
    {
        name: 'search_government_tenders',
        description:
            'Search official UK Contracts Finder (OCDS) and World Bank Global government RFP & procurement notices.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Keywords to match in open government tenders (e.g. ["software", "cloud"]).',
                },
                maxTenders: {
                    type: 'number',
                    description: 'Maximum notices to return (1-25).',
                    default: 10,
                },
            },
            required: ['keywords'],
        },
    },
    {
        name: 'analyze_appstore_aso',
        description:
            'Check Apple iOS & Mac App Store keyword rankings, ratings, versions, and pricing across regional storefronts.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                searchTerm: { type: 'string', description: 'App Store keyword to search (e.g. "clipboard manager").' },
                country: { type: 'string', description: '2-letter ISO country storefront (e.g. "us", "de", "jp").', default: 'us' },
                entity: {
                    type: 'string',
                    enum: ['software', 'macSoftware'],
                    description: '"software" for iOS or "macSoftware" for macOS.',
                    default: 'software',
                },
                limit: { type: 'number', description: 'Number of ranked apps to return (1-25).', default: 10 },
            },
            required: ['searchTerm'],
        },
    },
    {
        name: 'extract_llm_rag_docs',
        description:
            'Extract clean, boilerplate-stripped documentation text or llms.txt content from a technical docs URL for RAG context.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Documentation or llms.txt URL to extract.' },
            },
            required: ['url'],
        },
    },
    {
        name: 'analyze_chrome_extension',
        description:
            'Extract Chrome Web Store user counts, ratings, update staleness, and micro-SaaS opportunity signals by URL or 32-char ID.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                extensionUrlOrId: {
                    type: 'string',
                    description: 'Chrome Web Store detail URL or 32-char extension ID.',
                },
            },
            required: ['extensionUrlOrId'],
        },
    },
    {
        name: 'mine_wordpress_plugin_churn',
        description:
            'Search official WordPress.org plugins and calculate active installs plus 1-star & 2-star negative review churn share.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                searchQuery: { type: 'string', description: 'Keyword to search WordPress.org plugins (e.g. "woocommerce checkout").' },
                maxPlugins: { type: 'number', description: 'Max plugins to analyze (1-15).', default: 5 },
            },
            required: ['searchQuery'],
        },
    },
    {
        name: 'get_bluesky_author_feed',
        description:
            'Fetch public Bluesky AT Protocol posts and engagement metrics (likes, reposts, replies) for any Bluesky handle.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                handle: { type: 'string', description: 'Bluesky handle (e.g. "bsky.app" or "karpathy.bsky.social").' },
                limit: { type: 'number', description: 'Max posts to return (1-25).', default: 10 },
            },
            required: ['handle'],
        },
    },
];

const server = new Server(
    {
        name: 'olviklabs-b2b-mcp-servers',
        version: '1.1.0',
    },
    {
        capabilities: {
            tools: {},
            prompts: {},
            resources: {},
        },
    },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
        {
            name: 'competitor-saas-audit',
            description: 'Audit SaaS pricing tiers, App Store ASO rankings, and user review churn for a market vertical.',
        },
        {
            name: 'public-company-sec-brief',
            description: 'Summarize latest SEC 10-K/10-Q/8-K filings and XBRL GAAP fundamentals for a public stock ticker.',
        },
    ],
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
        {
            uri: 'olviklabs://catalog/tools',
            name: 'Olvik Labs B2B & Financial Intelligence Tool Catalog',
            mimeType: 'application/json',
            description: 'Metadata for all 8 local stdio & Apify-scaled B2B intelligence tools.',
        },
    ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => ({
    contents: [
        {
            uri: req.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({ publisher: 'Olvik Labs', website: 'https://olviklabs.com', tools: TOOLS.map((t) => t.name) }, null, 2),
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    try {
        let data: unknown;
        switch (name) {
            case 'extract_sec_edgar_filings': {
                const tickers = (args.tickers as string[]) ?? ['AAPL'];
                const formTypes = (args.formTypes as string[]) ?? ['10-K', '10-Q', '8-K'];
                const maxFilingsPerCompany = Number(args.maxFilingsPerCompany ?? 5);
                data = hasApifyToken()
                    ? await callApifyActor('sec-edgar-filing-intelligence', {
                          tickers,
                          formTypes,
                          maxFilingsPerCompany,
                          includeFinancialMetrics: true,
                      })
                    : wrapFreePreview(
                          'sec-edgar-filing-intelligence',
                          await runSecEdgarLocal(tickers.slice(0, 1), formTypes, MAX_FREE_PREVIEW_ITEMS),
                      );
                break;
            }
            case 'analyze_saas_pricing': {
                const pricingUrls = (args.pricingUrls as string[]) ?? ['https://linear.app/pricing'];
                data = hasApifyToken()
                    ? await callApifyActor('saas-pricing-intelligence', { pricingUrls })
                    : wrapFreePreview('saas-pricing-intelligence', await runSaasPricingLocal(pricingUrls.slice(0, 1)));
                break;
            }
            case 'search_government_tenders': {
                const keywords = (args.keywords as string[]) ?? ['software'];
                const maxTenders = Number(args.maxTenders ?? 10);
                data = hasApifyToken()
                    ? await callApifyActor('gov-tenders-intelligence', {
                          keywords,
                          maxTendersPerSource: maxTenders,
                      })
                    : wrapFreePreview(
                          'gov-tenders-intelligence',
                          await runGovTendersLocal(keywords, MAX_FREE_PREVIEW_ITEMS),
                      );
                break;
            }
            case 'analyze_appstore_aso': {
                const searchTerm = String(args.searchTerm ?? 'clipboard');
                const country = String(args.country ?? 'us');
                const entity = String(args.entity ?? 'software');
                const limit = Number(args.limit ?? 10);
                data = hasApifyToken()
                    ? await callApifyActor('appstore-aso-review-intelligence', {
                          keywords: [searchTerm],
                          countries: [country],
                          entity,
                          maxAppsPerKeyword: limit,
                          extractReviews: true,
                      })
                    : wrapFreePreview(
                          'appstore-aso-review-intelligence',
                          await runAppStoreAsoLocal(searchTerm, country, entity, MAX_FREE_PREVIEW_ITEMS),
                      );
                break;
            }
            case 'extract_llm_rag_docs': {
                const url = String(args.url ?? 'https://modelcontextprotocol.io/introduction');
                data = hasApifyToken()
                    ? await callApifyActor('llm-docs-rag-extractor', {
                          startUrls: [url],
                          maxPages: 10,
                      })
                    : wrapFreePreview('llm-docs-rag-extractor', await runLlmDocsLocal(url));
                break;
            }
            case 'analyze_chrome_extension': {
                const ext = String(args.extensionUrlOrId ?? 'bcjindcccaagfpapjjmafapmmgkkhgoa');
                data = hasApifyToken()
                    ? await callApifyActor('chrome-extension-analyzer', { extensions: [ext] })
                    : wrapFreePreview('chrome-extension-analyzer', await runChromeExtensionLocal(ext));
                break;
            }
            case 'mine_wordpress_plugin_churn': {
                const searchQuery = String(args.searchQuery ?? 'seo');
                const maxPlugins = Number(args.maxPlugins ?? 5);
                data = hasApifyToken()
                    ? await callApifyActor('wordpress-plugin-intelligence', { searchQuery, maxPlugins })
                    : wrapFreePreview(
                          'wordpress-plugin-intelligence',
                          await runWordPressChurnLocal(searchQuery, MAX_FREE_PREVIEW_ITEMS),
                      );
                break;
            }
            case 'get_bluesky_author_feed': {
                const handle = String(args.handle ?? 'bsky.app');
                const limit = Number(args.limit ?? 10);
                data = hasApifyToken()
                    ? await callApifyActor('bluesky-brand-intelligence', {
                          handles: [handle],
                          maxPostsPerTarget: limit,
                      })
                    : wrapFreePreview(
                          'bluesky-brand-intelligence',
                          await runBlueskyFeedLocal(handle, MAX_FREE_PREVIEW_ITEMS),
                      );
                break;
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            isError: true,
            content: [{ type: 'text', text: `Error executing ${name}: ${msg}` }],
        };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
