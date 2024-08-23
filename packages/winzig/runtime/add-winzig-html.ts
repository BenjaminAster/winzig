
export default (
	{ document, Text }: {
		document: Document,
		Text: typeof globalThis.Text,
	},
	buildData: any,
) => {
	document.documentElement.prepend(new Text("\n"));
	document.documentElement.insertBefore(new Text("\n"), document.body);
	document.documentElement.append(new Text("\n"));
	if (![...document.head.childNodes].some((node: Element) => node.localName === "meta" && node.getAttribute("name") === "viewport")) {
		const meta = document.createElement("meta");
		meta.setAttribute("name", "viewport");
		meta.setAttribute("content", "width=device-width, initial-scale=1, interactive-widget=resizes-content, viewport-fit=cover");
		document.head.prepend(meta);
	}
	if (![...document.head.childNodes].some((node: Element) => node.localName === "meta" && node.hasAttribute("charset"))) {
		const meta = document.createElement("meta");
		meta.setAttribute("charset", "UTF-8");
		document.head.prepend(meta);
	}
	for (const cssFilePath of buildData.cssFilePaths) {
		const stylesheetLink = document.createElement("link");
		stylesheetLink.setAttribute("rel", "stylesheet");
		stylesheetLink.setAttribute("href", cssFilePath);
		document.head.append(stylesheetLink);
	}
	{
		const importMapElement = document.createElement("script");
		importMapElement.setAttribute("type", "importmap");
		const stringifiedImportMap = JSON.stringify({ imports: Object.fromEntries(buildData.importMap) });
		importMapElement.append(new Text(stringifiedImportMap));
		document.head.append(importMapElement);
	}
	{
		const scriptElement = document.createElement("script");
		scriptElement.setAttribute("type", "module");
		scriptElement.setAttribute("src", buildData.entryFilePath);
		document.head.append(scriptElement);
	}
	for (const path of buildData.modulePreloadPaths) {
		const linkElement = document.createElement("link");
		linkElement.setAttribute("rel", "modulepreload");
		linkElement.setAttribute("href", path);
		document.head.append(linkElement);
	}
};
