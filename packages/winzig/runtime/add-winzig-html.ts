
export default (
	{ document, Text }: {
		document: Document,
		Text: typeof globalThis.Text,
	},
	data: any,
) => {
	document.documentElement.prepend(new Text("\n"));
	document.documentElement.insertBefore(new Text("\n"), document.body);
	document.documentElement.append(new Text("\n"));

	if (data.pretty) document.head.prepend(new Text("\n"));
	for (const path of data.modulePreloadPaths) {
		const linkElement = document.createElement("link");
		linkElement.setAttribute("rel", "modulepreload");
		linkElement.setAttribute("href", path);
		document.head.prepend(linkElement);
		if (data.pretty) document.head.prepend(new Text("\n"));
	}
	{
		const scriptElement = document.createElement("script");
		scriptElement.setAttribute("type", "module");
		scriptElement.setAttribute("src", data.entryFilePath);
		document.head.prepend(scriptElement);
		if (data.pretty) document.head.prepend(new Text("\n"));
	}
	{
		const importMapElement = document.createElement("script");
		importMapElement.setAttribute("type", "importmap");
		const stringifiedImportMap =
			(data.pretty ? "\n" : "")
			+ JSON.stringify({ imports: Object.fromEntries(data.importMap) }, null, data.pretty ? "\t" : undefined)
			+ (data.pretty ? "\n" : "");
		importMapElement.append(new Text(stringifiedImportMap));
		document.head.prepend(importMapElement);
		if (data.pretty) document.head.prepend(new Text("\n"));
	}
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
			`@layer overrides{`,
			(data.pretty ? "\t" : "") + `wz-frag{`,
			(data.pretty ? "\t\t" : "") + `display:contents;`,
			(data.pretty ? "\t" : "") + `}`,
			`}`,
			``,
		].join(data.pretty ? "\n" : "");
		styleElement.append(new Text(text));
		document.head.prepend(styleElement);
		if (data.pretty) document.head.prepend(new Text("\n"));
	}
	if (![...document.head.childNodes].some((node: Element) => node.localName === "meta" && node.getAttribute("name") === "viewport")) {
		const meta = document.createElement("meta");
		meta.setAttribute("name", "viewport");
		meta.setAttribute("content", "width=device-width, initial-scale=1, interactive-widget=resizes-content, viewport-fit=cover");
		document.head.prepend(meta);
		if (data.pretty) document.head.prepend(new Text("\n"));
	}
	{
		const meta = document.createElement("meta");
		meta.setAttribute("charset", "UTF-8");
		document.head.prepend(meta);
		if (data.pretty) document.head.prepend(new Text("\n"));
	}
};
