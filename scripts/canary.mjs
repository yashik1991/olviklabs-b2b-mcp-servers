const token = process.env.APIFY_TOKEN;
if (!token) {
    console.log('APIFY_TOKEN secret not set — skipping live canary.');
    process.exit(0);
}

const API = 'https://api.apify.com/v2';
const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
};

const CANARIES = [
    { slug: 'olviklabs~bluesky-brand-intelligence', input: { handles: ['bsky.app'], maxPostsPerTarget: 2 } },
    { slug: 'olviklabs~appstore-aso-review-intelligence', input: { keywords: ['paste'], countries: ['us'], maxAppsPerKeyword: 2, extractReviews: false } },
    { slug: 'olviklabs~llm-docs-rag-extractor', input: { startUrls: ['https://modelcontextprotocol.io/introduction'], discoverSitemapOrLlmsTxt: false, maxPages: 1 } },
    { slug: 'olviklabs~sec-edgar-filing-intelligence', input: { tickers: ['AAPL'], formTypes: ['10-K'], maxFilingsPerCompany: 1, includeFinancialMetrics: false } },
    { slug: 'olviklabs~saas-pricing-intelligence', input: { pricingUrls: ['https://linear.app/pricing'], maxMarkdownChars: 2000 } },
    { slug: 'olviklabs~chrome-extension-analyzer', input: { extensions: ['bcjindcccaagfpapjjmafapmmgkkhgoa'] } },
    { slug: 'olviklabs~gov-tenders-intelligence', input: { keywords: ['software'], sources: ['world_bank_global'], maxTendersPerSource: 2 } },
    { slug: 'olviklabs~wordpress-plugin-intelligence', input: { pluginSlugs: ['contact-form-7'], searchQuery: '', maxPlugins: 1 } },
];

let failed = 0;
for (const c of CANARIES) {
    const res = await fetch(`${API}/acts/${c.slug}/runs?waitForFinish=60`, {
        method: 'POST',
        headers,
        body: JSON.stringify(c.input),
    });
    const run = (await res.json()).data;
    if (run?.status === 'SUCCEEDED') {
        console.log(`[PASS] ${c.slug}`);
    } else {
        console.error(`[FAIL] ${c.slug}: ${run?.status}`);
        failed += 1;
    }
}
if (failed > 0) process.exit(1);
