function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function transformChildren(node) {
	if (!Array.isArray(node.children)) return;

	for (let index = 0; index < node.children.length; index += 1) {
		const child = node.children[index];
		if (child.type === "code" && child.lang === "mermaid") {
			node.children[index] = {
				type: "html",
				value: `<div class="mermaid">${escapeHtml(child.value)}</div>`,
			};
			continue;
		}

		transformChildren(child);
	}
}

export function remarkMermaid() {
	return transformChildren;
}
