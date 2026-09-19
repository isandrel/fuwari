type MermaidModule = typeof import("mermaid");

export {};

const state: {
	hookedSwup?: Window["swup"];
	modulePromise?: Promise<MermaidModule>;
} = {};

async function renderMermaid(): Promise<void> {
	const nodes = document.querySelectorAll<HTMLElement>(
		'.mermaid:not([data-processed="true"])',
	);
	if (nodes.length === 0) return;

	state.modulePromise ??= import("mermaid");
	const { default: mermaid } = await state.modulePromise;
	const isDark = document.documentElement.classList.contains("dark");
	mermaid.initialize({
		startOnLoad: false,
		securityLevel: "strict",
		theme: "base",
		themeVariables: isDark
			? {
					background: "#1f2937",
					edgeLabelBackground: "#1f2937",
					fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif",
					lineColor: "#e2e8f0",
					primaryBorderColor: "#a78bfa",
					primaryColor: "#312e81",
					primaryTextColor: "#f8fafc",
					secondaryColor: "#334155",
					tertiaryColor: "#0f172a",
				}
			: {
					background: "#ffffff",
					edgeLabelBackground: "#ffffff",
					fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif",
					lineColor: "#475569",
					primaryBorderColor: "#7c3aed",
					primaryColor: "#ede9fe",
					primaryTextColor: "#1f2937",
					secondaryColor: "#f1f5f9",
					tertiaryColor: "#ffffff",
				},
		flowchart: {
			curve: "basis",
			htmlLabels: true,
		},
	});
	await mermaid.run({ nodes });
}

function scanPage(): void {
	void renderMermaid().catch((error: unknown) => {
		console.error("Unable to render Mermaid diagram", error);
	});
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
