
type Node = import("./minimal-fake-dom.ts").Node;

export default (
	{ document, Text }: {
		document: import("./minimal-fake-dom.ts").Document,
		Text: typeof import("./minimal-fake-dom.ts").Text,
	},
	data: any,
) => {
	document.documentElement.prepend(new Text("\n"));
	document.documentElement.insertBefore(new Text("\n"), document.body);
	document.documentElement.append(new Text("\n"));

	const headNodes: Node[] = [];

	if (data.pretty) headNodes.push(new Text("\n"));
	{
		const meta = document.createElement("meta");
		meta.setAttribute("charset", "UTF-8");
		headNodes.push(meta);
	}
	if (data.pretty) headNodes.push(new Text("\n"));
	if (![...document.head.childNodes].some((node: Element) => node.localName === "meta" && node.getAttribute("name") === "viewport")) {
		const meta = document.createElement("meta");
		meta.setAttribute("name", "viewport");
		meta.setAttribute("content", "width=device-width, initial-scale=1, interactive-widget=resizes-content, viewport-fit=cover");
		headNodes.push(meta);
	}
	if (data.pretty) headNodes.push(new Text("\n"));
	{
		const styleElement = document.createElement("style");
		const text = [
			``,
			`@layer ${[
				...(data.globalCSSFilePath ? ["global"] : []),
				...(data.mainCSSFilePath ? ["main"] : []),
				"overrides",
			].join(data.pretty ? ", " : ",")};`,
			...(data.globalCSSFilePath ? [`@import ${JSON.stringify(data.globalCSSFilePath)} layer(global);`] : []),
			...(data.mainCSSFilePath ? [`@import ${JSON.stringify(data.mainCSSFilePath)} layer(main);`] : []),
			`@layer overrides${data.pretty ? " " : ""}{`,
			(data.pretty ? "\t" : "") + `wz-frag${data.pretty ? " " : ""}{`,
			(data.pretty ? "\t\t" : "") + `display:${data.pretty ? " " : ""}contents;`,
			(data.pretty ? "\t" : "") + `}`,
			`}`,
			``,
		].join(data.pretty ? "\n" : "");
		styleElement.append(new Text(text));
		headNodes.push(styleElement);
	}
	if (data.pretty) headNodes.push(new Text("\n"));
	if (data.importMap) {
		const importMapElement = document.createElement("script");
		importMapElement.setAttribute("type", "importmap");
		const stringifiedImportMap =
			(data.pretty ? "\n" : "")
			+ JSON.stringify({ imports: Object.fromEntries(data.importMap) }, null, data.pretty ? "\t" : undefined)
			+ (data.pretty ? "\n" : "");
		importMapElement.append(new Text(stringifiedImportMap));
		headNodes.push(importMapElement);
		if (data.pretty) headNodes.push(new Text("\n"));
	}
	if (data.entryFilePath) {
		const scriptElement = document.createElement("script");
		scriptElement.setAttribute("type", "module");
		scriptElement.setAttribute("src", data.entryFilePath);
		headNodes.push(scriptElement);
		if (data.pretty) headNodes.push(new Text("\n"));
	}
	for (const path of data.modulePreloadPaths) {
		const linkElement = document.createElement("link");
		linkElement.setAttribute("rel", "modulepreload");
		linkElement.setAttribute("href", path);
		headNodes.push(linkElement);
		if (data.pretty) headNodes.push(new Text("\n"));
	}

	document.head.prepend(...headNodes);
};
