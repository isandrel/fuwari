import assert from "node:assert/strict";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("dist");
const index = path.join(output, "sitemap-index.xml");
const target = path.join(output, "sitemap.xml");
const xml = await readFile(index, "utf8");
const children = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
	(match) => new URL(match[1]),
);
assert.ok(children.length, "Astro must generate at least one sitemap");

const redirects = ["/sitemap-index.xml /sitemap.xml 301"];
if (children.length === 1) {
	const child = children[0];
	const filename = path.join(output, child.pathname.slice(1));
	assert.ok(
		filename.startsWith(`${output}${path.sep}`),
		"Sitemap must be inside the build output",
	);
	await rename(filename, target);
	await rm(index);
	redirects.push(`${child.pathname} /sitemap.xml 301`);
} else {
	// Keep automatic splitting for large sites, with the same public entry point.
	await rename(index, target);
}

const redirectsFile = path.join(output, "_redirects");
const existing = await readFile(redirectsFile, "utf8").catch((error) => {
	if (error.code !== "ENOENT") throw error;
	return "";
});
await writeFile(
	redirectsFile,
	`${existing.trimEnd()}\n# Generated sitemap compatibility redirects\n${redirects.join("\n")}\n`,
);
console.log(
	`Published automatically generated sitemap.xml (${children.length === 1 ? "URL list" : "sitemap index"}).`,
);
