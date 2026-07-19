type UmamiStats = {
	pageviews: number;
	visitors: number;
};

type StatsClientState = {
	observer: IntersectionObserver;
	requests: Map<string, Promise<UmamiStats>>;
	hookedSwup?: Window["swup"];
	warned: boolean;
};

const state = window.__umamiStatsClient ?? createState();
window.__umamiStatsClient = state;

function createState(): StatsClientState {
	return {
		observer: new IntersectionObserver(handleIntersections, {
			rootMargin: "50px",
			threshold: 0.1,
		}),
		requests: new Map(),
		warned: false,
	};
}

function getStatsEndpoint(): string | null {
	return (
		document.querySelector<HTMLElement>("#config-carrier")?.dataset
			.umamiStatsUrl ?? null
	);
}

function getStats(path?: string): Promise<UmamiStats> {
	const key = path ?? "__site_total__";
	const existing = state.requests.get(key);
	if (existing) return existing;

	const request = (async () => {
		const endpoint = getStatsEndpoint();
		if (!endpoint)
			throw new Error("Umami statistics endpoint is not configured");

		const url = new URL(endpoint);
		if (path) url.searchParams.set("path", path);
		const response = await fetch(url, {
			headers: { Accept: "application/json" },
		});
		if (!response.ok)
			throw new Error(`Umami statistics returned ${response.status}`);

		const data = (await response.json()) as Partial<UmamiStats>;
		if (
			typeof data.pageviews !== "number" ||
			typeof data.visitors !== "number"
		) {
			throw new Error("Umami statistics returned an invalid payload");
		}
		return { pageviews: data.pageviews, visitors: data.visitors };
	})();

	state.requests.set(key, request);
	return request;
}

function handleIntersections(entries: IntersectionObserverEntry[]): void {
	for (const entry of entries) {
		if (!entry.isIntersecting) continue;
		state.observer.unobserve(entry.target);
		const slug = (entry.target as HTMLElement).dataset.postSlug;
		if (slug) void updatePostStats(slug);
	}
}

function animateNumber(
	element: HTMLElement,
	targetValue: number,
	duration: number,
	format: (value: number) => string = String,
): void {
	if (
		element.dataset.animating === "true" ||
		element.dataset.animated === "true"
	) {
		element.textContent = format(targetValue);
		return;
	}

	element.dataset.animating = "true";
	const startTime = performance.now();
	const update = (currentTime: number) => {
		const progress = Math.min((currentTime - startTime) / duration, 1);
		const eased = 1 - (1 - progress) ** 3;
		element.textContent = format(Math.floor(targetValue * eased));

		if (progress < 1) {
			requestAnimationFrame(update);
			return;
		}

		element.textContent = format(targetValue);
		element.classList.add("stats-loaded");
		element.dataset.animated = "true";
		delete element.dataset.animating;
	};
	requestAnimationFrame(update);
}

function elementsForSlug(selector: string, slug: string): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
		(element) => element.dataset.slug === slug,
	);
}

async function updatePostStats(slug: string): Promise<void> {
	try {
		const stats = await getStats(`/posts/${slug}/`);
		for (const element of elementsForSlug(".post-pv", slug)) {
			animateNumber(element, stats.pageviews, 400);
		}
		for (const element of elementsForSlug(".post-uv", slug)) {
			animateNumber(element, stats.visitors, 400);
		}
	} catch (error) {
		warnOnce(error);
		for (const element of [
			...elementsForSlug(".post-pv", slug),
			...elementsForSlug(".post-uv", slug),
		]) {
			element.textContent = "-";
			element.classList.add("stats-loaded");
		}
	}
}

function formatTotal(value: number): string {
	if (value >= 10_000) return `${(value / 10_000).toFixed(1)}w`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
	return value.toLocaleString();
}

async function updateSiteStats(): Promise<void> {
	const pageviews = document.querySelector<HTMLElement>("#total-pageviews");
	const visitors = document.querySelector<HTMLElement>("#total-visitors");
	if (!pageviews && !visitors) return;

	try {
		const stats = await getStats();
		if (pageviews)
			animateNumber(pageviews, stats.pageviews, 1_200, formatTotal);
		if (visitors) animateNumber(visitors, stats.visitors, 1_000, formatTotal);
	} catch (error) {
		warnOnce(error);
		for (const element of [pageviews, visitors]) {
			if (!element) continue;
			element.textContent = "--";
			element.classList.add("stats-loaded");
		}
	}
}

function warnOnce(error: unknown): void {
	if (state.warned) return;
	state.warned = true;
	console.warn("Unable to load public Umami statistics", error);
}

function scanPage(): void {
	for (const row of document.querySelectorAll<HTMLElement>(
		"[data-post-slug]",
	)) {
		if (row.dataset.umamiObserved === "true") continue;
		row.dataset.umamiObserved = "true";
		state.observer.observe(row);
	}
	void updateSiteStats();
}

function hookSwup(): void {
	if (!window.swup || state.hookedSwup === window.swup) return;
	state.hookedSwup = window.swup;
	window.swup.hooks.on("page:view", scanPage);
}

function initialize(): void {
	hookSwup();
	scanPage();
}

document.addEventListener("swup:enable", initialize);
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
	initialize();
}
