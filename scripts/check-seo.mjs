import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const origin = "https://blog.isandrel.com";
const output = path.resolve("dist");
const read = (file) => readFile(path.join(output, file), "utf8");
const locations = (xml) =>
	[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const decode = (value) =>
	value
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&#x27;/g, "'")
		.replace(/&amp;/g, "&");
const attributes = (tag) =>
	Object.fromEntries(
		[...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map((match) => [
			match[1],
			decode(match[3]),
		]),
	);
const tags = (html, name) =>
	[...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) =>
		attributes(match[0]),
	);

const sitemap = await read("sitemap.xml");
const urls = [];
if (sitemap.includes("<sitemapindex")) {
	const sitemaps = locations(sitemap);
	assert.ok(sitemaps.length, "Sitemap index must contain a sitemap");
	for (const child of sitemaps) {
		assert.equal(
			new URL(child).origin,
			origin,
			"Sitemap index must use the blog host",
		);
		urls.push(...locations(await read(new URL(child).pathname.slice(1))));
	}
} else {
	assert.ok(
		sitemap.includes("<urlset"),
		"sitemap.xml must contain a URL list or index",
	);
	urls.push(...locations(sitemap));
}
assert.ok(urls.length, "Sitemap must contain pages");
assert.equal(new Set(urls).size, urls.length, "Sitemap must not repeat URLs");

const titles = new Set();
let articles = 0;
for (const address of urls) {
	const url = new URL(address);
	assert.equal(url.origin, origin, `Unexpected sitemap host: ${address}`);
	assert.equal(
		url.search,
		"",
		`Sitemap must not contain filtered URLs: ${address}`,
	);
	const html = await read(
		path.join(decodeURIComponent(url.pathname), "index.html"),
	);
	const links = tags(html, "link");
	assert.equal(
		links.find((tag) => tag.rel === "sitemap")?.href,
		`${origin}/sitemap.xml`,
		`Incorrect sitemap discovery link: ${address}`,
	);
	const canonicals = links.filter((tag) => tag.rel === "canonical");
	assert.equal(canonicals.length, 1, `Expected one canonical: ${address}`);
	assert.equal(
		canonicals[0].href,
		address,
		`Canonical must match sitemap URL: ${address}`,
	);
	const meta = tags(html, "meta");
	assert.equal(
		meta.find((tag) => tag.property === "og:url")?.content,
		address,
		`Incorrect Open Graph URL: ${address}`,
	);
	assert.equal(
		meta.find((tag) => tag.property === "twitter:url")?.content,
		address,
		`Incorrect Twitter URL: ${address}`,
	);
	assert.ok(
		meta.find((tag) => tag.name === "description")?.content,
		`Missing description: ${address}`,
	);
	assert.ok(
		!meta.some(
			(tag) =>
				/^(robots|googlebot)$/i.test(tag.name || "") &&
				/noindex/i.test(tag.content || ""),
		),
		`Indexable page has noindex: ${address}`,
	);
	const title = html.match(/<title[^>]*>(.*?)<\/title>/s)?.[1];
	assert.ok(title, `Missing title: ${address}`);
	assert.ok(!titles.has(title), `Duplicate title: ${address}`);
	titles.add(title);
	assert.equal(
		tags(html, "script").find((tag) => tag["data-website-id"])?.[
			"data-domains"
		],
		url.hostname,
		`Analytics domain must match the blog: ${address}`,
	);
	if (url.pathname.startsWith("/posts/")) {
		articles++;
		assert.equal(
			tags(html, "h1").filter((tag) => tag["data-pagefind-meta"] === "title")
				.length,
			1,
			`Article must have one main title heading: ${address}`,
		);
		const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
			.filter((match) => attributes(match[1]).type === "application/ld+json")
			.map((match) => JSON.parse(match[2]));
		const article = blocks.find((block) => block["@type"] === "BlogPosting");
		assert.ok(article, `Missing BlogPosting metadata: ${address}`);
		assert.equal(article.url, address, `Incorrect article URL: ${address}`);
		assert.equal(
			article.mainEntityOfPage?.["@id"],
			address,
			`Incorrect article canonical: ${address}`,
		);
		assert.equal(
			article.author?.url,
			`${origin}/about/`,
			`Incorrect author URL: ${address}`,
		);
		assert.ok(article.datePublished, `Missing publication date: ${address}`);
		for (const image of article.image || []) {
			const imageUrl = new URL(image);
			if (imageUrl.origin === origin) await read(imageUrl.pathname.slice(1));
		}
	}
}

const robots = await read("robots.txt");
assert.ok(
	robots.includes(`Sitemap: ${origin}/sitemap.xml`),
	"robots.txt must advertise the blog sitemap",
);
assert.ok(
	!/^Disallow:\s*\/(?:_astro\/)?\s*$/m.test(robots),
	"robots.txt must allow page rendering resources",
);
const rss = await read("rss.xml");
assert.ok(
	(await read("_redirects")).includes("/sitemap-index.xml /sitemap.xml 301"),
	"Old sitemap address must redirect to sitemap.xml",
);
assert.ok(rss.includes(`${origin}/`), "RSS must use the blog host");
for (const match of rss.matchAll(/<link>([^<]+)<\/link>/g)) {
	assert.equal(
		new URL(decode(match[1])).origin,
		origin,
		"RSS page links must use the blog host",
	);
}
for (const slug of [
	"rclone-google-drive-setup",
	"cloudflare-526-ssl-error-on-github-pages",
	"deploy-cloudflare-temp-email-with-github-actions",
	"setting-up-nodewarden-on-cloudflare-workers",
]) {
	assert.ok(
		urls.includes(`${origin}/posts/${slug}/`),
		`Important article missing from sitemap: ${slug}`,
	);
}
console.log(
	`SEO checks passed for ${urls.length} pages and ${articles} articles, including sitemap, canonical URLs, metadata, robots.txt, RSS, and local article images.`,
);
