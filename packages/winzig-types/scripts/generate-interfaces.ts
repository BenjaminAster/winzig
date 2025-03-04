
/* 
node --experimental-strip-types ./scripts/generate-interfaces.ts
 */

import * as FS from "node:fs/promises";
import * as Path from "node:path";

const url = "https://raw.githubusercontent.com/microsoft/TypeScript/main/src/lib/dom.generated.d.ts";
const domLib = await (await global.fetch(url)).text();

const allPropertiesMap = new Map<string, {
	definitions: Set<string>;
	validFor: Set<string>;
	deprecated: boolean;
	readonly: boolean;
}>();

const allMethodsMap = new Map<string, {
	overloads: Set<string>,
	validFor: Set<string>,
	deprecated: boolean;
}>();

const interfaces = new Map<string, {
	extends?: string[],
	properties: Map<string, string>,
}>();

// const nonEmptyAttributesInterfaces = new Set<string>();

const deprecatedHTMLElementInterfaces = new Set([
	"HTMLDirectoryElement",
	"HTMLFontElement",
	"HTMLFrameElement",
	"HTMLFrameSetElement",
	"HTMLMarqueeElement",
	"HTMLParamElement",
]);

const svgElementsCollidingWithHTML = new Set([
	"a",
	"style",
	"script",
	"title",
]);

// const requiredAttributes: Record<string, Set<string>> = {
// 	HTMLInputElement: new Set(["type"]),
// 	HTMLImageElement: new Set(["src", "alt"]),
// };

const additionalInterfaces = [
	"ARIAMixin",
	"Animatable",
	"ChildNode",
	"ElementContentEditable",
	"ElementCSSInlineStyle",
	"EventTarget",
	"GlobalEventHandlers",
	"HTMLHyperlinkElementUtils",
	"InnerHTML",
	"LinkStyle",
	"Node",
	"NonDocumentTypeChildNode",
	"ParentNode",
	"PopoverInvokerElement",
	"Slottable",
	"SVGAnimatedPoints",
	"SVGFilterPrimitiveStandardAttributes",
	"SVGFitToViewBox",
	"SVGTests",
	"SVGURIReference",
];

const interfacesAlreadyInElement = new Set([
	"Element",
	"Node",
	"ARIAMixin",
	"Animatable",
	"ChildNode",
	"NonDocumentTypeChildNode",
	"ParentNode",
	"Slottable",
	"EventTarget",
]);

const mathMLTagNameToAttributesOverridesMap = Object.assign(Object.create(null), {
	math: "MathMLMathElement",
	mfrac: "MathMLMFracElement",
	mo: "MathMLMOElement",
	mpadded: "MathMLMPaddedElement",
	mspace: "MathMLMSpaceElement",
	munderover: "MathMLMUnderOverElement",
	mtd: "MathMLMTableCellElement",
});

const svgAnimatedTypes = new Map(Object.entries({
	SVGAnimatedAngle: "string | number",
	SVGAnimatedBoolean: "string | boolean",
	SVGAnimatedEnumeration: "string",
	SVGAnimatedInteger: "string | number",
	SVGAnimatedLength: "string | number",
	SVGAnimatedLengthList: "string | number",
	SVGAnimatedNumber: "string | number",
	SVGAnimatedNumberList: "string | number",
	SVGAnimatedPreserveAspectRatio: "string | number",
	SVGAnimatedRect: "string | number",
	SVGAnimatedString: "string",
	SVGAnimatedTransformList: "string | number",
}));

const toSafePropertyName = (name: string) => name.includes("-") ? JSON.stringify(name) : name;

let allSVGAnimatedProperties = new Set<string>();

const htmlTagNames: [string, string][] = [];
const svgTagNames: [string, string][] = [];
const mathMLTagNames: [string, string][] = [];

for (const match of domLib.matchAll(
	new RegExp([
		String.raw`^interface (?<name>\w*Element|\w+ElementTagNameMap|${additionalInterfaces.join("|")})`,
		String.raw`(?: extends (?<baseInterfaces>.+))? {\n(?<content>(?:    .+\n)+)`
	].join(""), "mg")
)) {
	const interfaceName = match.groups.name;

	if (interfaceName.endsWith("ElementTagNameMap")) {
		for (let [name, elementInterface] of match.groups.content.trim().split("\n").map(
			line => line.trim().slice(1, -1).split(`": `)
		)) {
			// if (interfaceName === "SVGElementTagNameMap" && svgElementsCollidingWithHTML.has(name)) name = `"svg:${name}"`;
			switch (interfaceName) {
				case "HTMLElementTagNameMap": {
					htmlTagNames.push([name, elementInterface]);
					break;
				}
				case "SVGElementTagNameMap": {
					svgTagNames.push([name, elementInterface]);
					break;
				}
				case "MathMLElementTagNameMap": {
					mathMLTagNames.push([name, mathMLTagNameToAttributesOverridesMap[name] || elementInterface]);
					break;
				}
			}
		}
	} else {
		const baseInterfaces = match.groups.baseInterfaces?.split(", ").map(base => `ElementAttributes.${base}Attributes`);

		// console.log(interfaceName, baseInterfaces);
		// const baseInterfaces = match.groups.baseInterfaces?.split(", ") ?? [];
		// console.log(interfaceName, baseInterfaces);
		if (deprecatedHTMLElementInterfaces.has(interfaceName)) continue;
		// let isFormInterface = interfaceName === "HTMLFormElement";

		const interfaceInfo = {
			extends: baseInterfaces,
			properties: new Map<string, string>(),
		};
		const shouldAddToGenericElementInterface = !interfacesAlreadyInElement.has(interfaceName);
		// let hasConfigurableProperties = false;

		const members = match.groups.content.replaceAll("\n    ", "\n\t").split(";\n").slice(0, -1);
		for (const member of members) {
			const declarationLine = member.split("\n").at(-1).trim();
			let match: RegExpMatchArray;
			if (match = declarationLine.match(/^(?<isReadonly>readonly )?(?<propertyName>\w+)\??\: (?<definition>.+)$/)) {
				let { propertyName, definition, isReadonly } = match.groups;
				const isDeprecated = member.includes("@deprecated");
				if (
					!isDeprecated
					&& interfaceName !== "GlobalEventHandlers"
				) {
					const svgAnimatedType = svgAnimatedTypes.get(definition);
					if (svgAnimatedType) allSVGAnimatedProperties.add(propertyName);
					if (!isReadonly || svgAnimatedType) {
						// if (svgAnimatedTypes.has(definition)) a.has(propertyName) ? a.get(propertyName).add(definition) : a.set(propertyName, new Set([definition]));
						// hasConfigurableProperties = true;
						interfaceInfo.properties.set(propertyName, svgAnimatedType || definition);
					}
				}
				if (shouldAddToGenericElementInterface) {
					let propertyInfo = allPropertiesMap.get(propertyName);
					if (!propertyInfo) allPropertiesMap.set(propertyName, propertyInfo = {
						definitions: new Set(),
						validFor: new Set(),
						deprecated: true,
						readonly: true,
					});
					if (!isDeprecated) propertyInfo.deprecated = false;
					if (!isReadonly) {
						propertyInfo.readonly = false;
					}
					propertyInfo.validFor.add(interfaceName);
					for (const subDefinition of definition.split(" | ")) propertyInfo.definitions.add(subDefinition);
				}
			} else if (match = declarationLine.match(/^(?<methodName>\w+)[<(]/)) {
				if (shouldAddToGenericElementInterface) {
					let { methodName } = match.groups;
					if (["addEventListener", "removeEventListener"].includes(methodName)) continue;
					let methodInfo = allMethodsMap.get(methodName);
					if (!methodInfo) allMethodsMap.set(methodName, methodInfo = {
						overloads: new Set(),
						validFor: new Set(),
						deprecated: true,
					});
					if (!member.includes("@deprecated")) methodInfo.deprecated = false;
					methodInfo.validFor.add(interfaceName);
					methodInfo.overloads.add(declarationLine);
				}
			} else {
				console.log(`skipped property/method ${declarationLine} (${interfaceName})`);
			}
		}

		interfaces.set(interfaceName, interfaceInfo);
		// if (hasConfigurableProperties) {
		// 	// nonEmptyAttributesInterfaces.add(`ElementAttributes.${interfaceName}Attributes`);
		// }
	}
}

// const kebabToCamelCase = (input: string) => input.replaceAll(/-./g, (str) => str[1].toUpperCase());

// console.log([...a].sort());

{
	// More specific string stypes:
	const joinStringTypes = (types: string[]) => types.map(type => JSON.stringify(type)).join(" | ");

	const orStringWithAutocomplete = " | (string & {})";
	const orNull = " | null";
	const booleanString = joinStringTypes(["true", "false"]);
	const booleanish = booleanString + " | boolean"; // booleans are usually automatically converted to strings as per WebIDL spec

	interfaces.get("HTMLElement").properties.set("autocapitalize", joinStringTypes([
		"off", "none", "on", "sentences", "words", "characters"
	]));
	interfaces.get("HTMLElement").properties.set("autocorrect", "boolean");
	interfaces.get("HTMLElement").properties.set("dir", joinStringTypes([
		"ltr", "rtl", "auto"
	]));
	interfaces.get("HTMLElement").properties.set("hidden", 'boolean | "until-found"');
	interfaces.get("HTMLElement").properties.set("dir",
		joinStringTypes(["rtl", "ltr", "auto"]) + orNull
	);
	interfaces.get("HTMLElement").properties.set("writingSuggestions", booleanish);

	interfaces.get("ElementContentEditable").properties.set("enterKeyHint", joinStringTypes([
		"enter", "done", "go", "next", "previous", "search", "send"
	]));
	interfaces.get("ElementContentEditable").properties.set("contentEditable", joinStringTypes([
		"true", "false", "plaintext-only", "inherit"
	]));
	interfaces.get("ElementContentEditable").properties.set("inputMode", joinStringTypes([
		"none", "text", "tel", "url", "email", "numeric", "decimal", "search"
	]));

	interfaces.get("HTMLInputElement").properties.set("type", joinStringTypes([
		// https://html.spec.whatwg.org/multipage/input.html#attr-input-type
		"hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local",
		"number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"
	]));
	// https://w3c.github.io/html-media-capture/#dfn-capture
	interfaces.get("HTMLInputElement").properties.set("capture", joinStringTypes(["user", "environment", ""]));
	interfaces.get("HTMLAnchorElement").properties.set("referrerPolicy", "ReferrerPolicy");
	interfaces.get("HTMLAreaElement").properties.set("referrerPolicy", "ReferrerPolicy");
	interfaces.get("HTMLImageElement").properties.set("referrerPolicy", "ReferrerPolicy");
	interfaces.get("HTMLLinkElement").properties.set("referrerPolicy", "ReferrerPolicy");
	interfaces.get("HTMLScriptElement").properties.set("referrerPolicy", "ReferrerPolicy");

	interfaces.get("HTMLMetaElement").properties.set("name", joinStringTypes([
		// https://html.spec.whatwg.org/multipage/semantics.html#standard-metadata-names
		"application-name", "author", "description", "generator", "keywords", "referrer", "theme-color", "color-scheme",

		// https://wiki.whatwg.org/wiki/MetaExtensions
		"license", "robots", "viewport", "version",

		// https://developer.x.com/en/docs/x-for-websites/cards/overview/markup
		"twitter:card", "twitter:site", "twitter:site:id", "twitter:creator", "twitter:creator:id",
		"twitter:description", "twitter:title", "twitter:image", "twitter:image:alt", "twitter:player",
		"twitter:player:width", "twitter:player:height", "twitter:player:stream", "twitter:app:name:iphone",
		"twitter:app:id:iphone", "twitter:app:url:iphone", "twitter:app:name:ipad", "twitter:app:id:ipad",
		"twitter:app:url:ipad", "twitter:app:name:googleplay", "twitter:app:id:googleplay", "twitter:app:url:googleplay",

		// https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/DocumentSubtitle/explainer.md
		"app-title",
	]) + orStringWithAutocomplete);
	interfaces.get("HTMLMetaElement").properties.set("httpEquiv", joinStringTypes([
		// https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv
		"content-language", "content-type", "default-style", "refresh", "set-cookie", "x-ua-compatible", "content-security-policy",

		// https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md#how-do-i-enable-an-experimental-feature-on-my-origin
		"origin-trial",
	]) + orStringWithAutocomplete);
	{
		// https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword
		const targetType = joinStringTypes(["_blank", "_self", "_parent", "_top"]) + orStringWithAutocomplete;
		interfaces.get("HTMLAnchorElement").properties.set("target", targetType);
		interfaces.get("HTMLAreaElement").properties.set("target", targetType);
		interfaces.get("HTMLButtonElement").properties.set("formTarget", targetType);
		interfaces.get("HTMLInputElement").properties.set("formTarget", targetType);
	}
	{
		// https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fs-method
		const methodType = joinStringTypes(["get", "post", "dialog"]);
		interfaces.get("HTMLButtonElement").properties.set("formMethod", methodType);
		interfaces.get("HTMLFormElement").properties.set("method", methodType);
		interfaces.get("HTMLInputElement").properties.set("formMethod", methodType);
	}
	{
		const linkTypes = joinStringTypes([
			// https://html.spec.whatwg.org/multipage/links.html#linkTypes
			"alternate", "canonical", "author", "bookmark", "dns-prefetch", "expect", "external", "help",
			"icon", "manifest", "modulepreload", "license", "next", "nofollow", "noopener", "noreferrer",
			"opener", "pingback", "preconnect", "prefetch", "preload", "prev", "privacy-policy", "search",
			"stylesheet", "tag", "terms-of-service",

			// https://microformats.org/wiki/existing-rel-values#HTML5_link_type_extensions
			"about", "archived", "attachment", "category", "code-repository", "code-license", "component", "chrome-webstore-item",
			"content-repository", "content-license", "disclosure", "discussion", "donation", "edit", "enclosure", "sitemap",
		]) + " | (string & {})";
		interfaces.get("HTMLAnchorElement").properties.set("rel", linkTypes);
		interfaces.get("HTMLAreaElement").properties.set("rel", linkTypes);
		interfaces.get("HTMLLinkElement").properties.set("rel", linkTypes);
		interfaces.get("HTMLFormElement").properties.set("rel", linkTypes);
	}
	{
		// https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fs-enctype
		const encTypes = joinStringTypes(["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"]);
		interfaces.get("HTMLFormElement").properties.set("encoding", encTypes);
		interfaces.get("HTMLFormElement").properties.set("enctype", encTypes);
		interfaces.get("HTMLInputElement").properties.set("formEnctype", encTypes);
		interfaces.get("HTMLButtonElement").properties.set("formEnctype", encTypes);
	}
	// https://html.spec.whatwg.org/multipage/grouping-content.html#attr-ol-type
	interfaces.get("HTMLOListElement").properties.set("type", joinStringTypes(["1", "a", "A", "i", "I"]));
	{
		const potentialDestination = joinStringTypes([
			// https://fetch.spec.whatwg.org/#concept-potential-destination
			"fetch",
			// https://fetch.spec.whatwg.org/#concept-request-destination
			"audio", "audioworklet", "document", "embed", "font", "frame", "iframe", "image", "json", "manifest", "object", "paintworklet", "report", "script", "serviceworker", "sharedworker", "style", "track", "video", "webidentity", "worker", "xslt"
		]);
		interfaces.get("HTMLLinkElement").properties.set("as", potentialDestination);
	}
	{
		// https://html.spec.whatwg.org/multipage/urls-and-fetching.html#fetch-priority-attribute
		const fetchPriority = joinStringTypes(["high", "low", "auto"]);
		interfaces.get("HTMLLinkElement").properties.set("fetchPriority", fetchPriority);
		interfaces.get("HTMLImageElement").properties.set("fetchPriority", fetchPriority);
		interfaces.get("HTMLScriptElement").properties.set("fetchPriority", fetchPriority);
	}
	{
		// https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attribute
		const crossOriginTypes = joinStringTypes(["anonymous", "use-credentials", ""]) + orNull;
		interfaces.get("HTMLLinkElement").properties.set("crossOrigin", crossOriginTypes);
		interfaces.get("HTMLImageElement").properties.set("crossOrigin", crossOriginTypes);
		interfaces.get("HTMLMediaElement").properties.set("crossOrigin", crossOriginTypes);
		interfaces.get("HTMLScriptElement").properties.set("crossOrigin", crossOriginTypes);
	}
	interfaces.get("HTMLAreaElement").properties.set("shape", joinStringTypes([
		// https://html.spec.whatwg.org/multipage/image-maps.html#attr-area-shape
		// non-conforming aliases (circ, polygon, rectangle) excluded
		"circle", "default", "poly", "rect"
	]));

	// Remove somewhat deprecated global event listeners on <body>:
	for (const interfaceName of ["HTMLBodyElement", "SVGSVGElement"]) {
		const info = interfaces.get(interfaceName);
		info.extends = info.extends.filter(base => base !== "ElementAttributes.WindowEventHandlersAttributes");
	}

	// https://github.com/w3c/aria/pull/2326
	interfaces.get("ARIAMixin").properties.set("ariaRelevant", "string" + orNull);
	interfaces.get("ARIAMixin").properties.set("role", joinStringTypes([
		// https://w3c.github.io/aria/#role_definitions
		"alert", "alertdialog", "application", "article", "banner", "blockquote", "button", "caption",
		"cell", "checkbox", "code", "columnheader", "combobox", "command", "comment", "complementary",
		"composite", "contentinfo", "definition", "deletion", "dialog", "directory", "document", "emphasis",
		"feed", "figure", "form", "generic", "grid", "gridcell", "group", "heading", "image", "img",
		"input", "insertion", "landmark", "link", "list", "listbox", "listitem", "log", "main", "mark",
		"marquee", "math", "menu", "menubar", "menuitem", "menuitemcheckbox", "menuitemradio", "meter",
		"navigation", "none", "note", "option", "paragraph", "presentation", "progressbar", "radio",
		"radiogroup", "range", "region", "roletype", "row", "rowgroup", "rowheader", "scrollbar",
		"search", "searchbox", "section", "sectionhead", "select", "separator", "slider", "spinbutton",
		"status", "strong", "structure", "subscript", "suggestion", "superscript", "switch", "tab",
		"table", "tablist", "tabpanel", "term", "textbox", "time", "timer", "toolbar", "tooltip",
		"tree", "treegrid", "treeitem", "widget", "window"
	]) + orStringWithAutocomplete + orNull);
	// TODO: other aria attributes

	{
		// account for WebIDL's [PutForwards] extended attribute that TypeScript doesn't recognize:
		// https://webidl.spec.whatwg.org/#PutForwards
		interfaces.get("ElementCSSInlineStyle").properties.set("style", "string");
		interfaces.get("HTMLLinkElement").properties.set("relList", "string");
		interfaces.get("HTMLLinkElement").properties.set("sizes", "string");
		interfaces.get("HTMLLinkElement").properties.set("blocking", "string");
		interfaces.get("HTMLStyleElement").properties.set("blocking", "string");
		interfaces.get("HTMLAnchorElement").properties.set("relList", "string");
		interfaces.get("HTMLIFrameElement").properties.set("sandbox", "string");
		interfaces.get("HTMLAreaElement").properties.set("relList", "string");
		interfaces.get("HTMLFormElement").properties.set("relList", "string");
		interfaces.get("HTMLOutputElement").properties.set("htmlFor", "string");
		interfaces.get("HTMLScriptElement").properties.set("blocking", "string");
	}

	{
		// Attributes that do not have a corresponding IDL attribute

		// Unofficial OpenGraph `.property` attribute:
		interfaces.get("HTMLMetaElement").properties.set(`"attr:property"`, joinStringTypes([
			// https://ogp.me/
			"og:title", "og:type", "og:image", "og:url", "og:audio", "og:description", "og:determiner", "og:locale",
			"og:locale:alternate", "og:site_name", "og:video", "og:image", "og:image:url", "og:image",
			"og:image:secure_url", "og:image:type", "og:image:width", "og:image:height", "og:image:alt", "og:image:alt",
			"og:video", "og:image", "og:audio", "og:type", "og:type", "og:type", "og:type", "og:type", "og:type"
		]) + orStringWithAutocomplete + orNull);

		interfaces.get("HTMLElement").properties.set(`"attr:itemid"`, "string" + orNull);
		interfaces.get("HTMLElement").properties.set(`"attr:itemprop"`, "string" + orNull);
		interfaces.get("HTMLElement").properties.set(`"attr:itemref"`, "string" + orNull);
		interfaces.get("HTMLElement").properties.set(`"attr:itemscope"`, "string" + orNull);
		interfaces.get("HTMLElement").properties.set(`"attr:itemtype"`, "string" + orNull);

		// https://w3c.github.io/mathml-core/#dfn-displaystyle
		interfaces.get("MathMLElement").properties.set(`"attr:displaystyle"`, booleanish + orNull);
		// https://w3c.github.io/mathml-core/#dfn-scriptlevel
		interfaces.get("MathMLElement").properties.set(`"attr:scriptlevel"`, "string" + orNull);

		// The following interfaces do not exist in the MathML specification.
		// (All MathML elements implement the generic MathMLElement interface.)
		// I am therefore making up these names, hoping that the W3C Math Working Group
		// will use the same names in case they ever get specified.
		// The question is especially whether the M prefix would be included in the interface name or not.
		// https://github.com/w3c/mathml-core/issues/159

		{
			let mathMLMathElementAttributes = interfaces.get("MathMLMathElement");
			if (!mathMLMathElementAttributes) interfaces.set("MathMLMathElement", mathMLMathElementAttributes = {
				extends: ["ElementAttributes.MathMLElementAttributes"],
				properties: new Map(),
			});
			// https://w3c.github.io/mathml-core/#dfn-display
			mathMLMathElementAttributes.properties.set(`"attr:display"`, joinStringTypes(["block", "inline"]) + orNull);
		}

		{
			let mathMLMOElementAttributes = interfaces.get("MathMLMOElement");
			if (!mathMLMOElementAttributes) interfaces.set("MathMLMOElement", mathMLMOElementAttributes = {
				extends: ["ElementAttributes.MathMLElementAttributes"],
				properties: new Map(),
			});
			// https://w3c.github.io/mathml-core/#mo-attributes
			mathMLMOElementAttributes.properties.set(`"attr:form"`, joinStringTypes(["infix", "prefix", "postfix"]) + orNull);
			mathMLMOElementAttributes.properties.set(`"attr:lspace"`, "string" + orNull);
			mathMLMOElementAttributes.properties.set(`"attr:rspace"`, "string" + orNull);
			mathMLMOElementAttributes.properties.set(`"attr:stretchy"`, booleanish + orNull);
			mathMLMOElementAttributes.properties.set(`"attr:symmetric"`, booleanish + orNull);
			mathMLMOElementAttributes.properties.set(`"attr:maxsize"`, "string" + orNull);
			mathMLMOElementAttributes.properties.set(`"attr:minsize"`, "string" + orNull);
			mathMLMOElementAttributes.properties.set(`"attr:largeop"`, booleanish + orNull);
			mathMLMOElementAttributes.properties.set(`"attr:movablelimits"`, booleanish + orNull);
		}

		{
			let mathMLMPaddedElementAttributes = interfaces.get("MathMLMPaddedElement");
			if (!mathMLMPaddedElementAttributes) interfaces.set("MathMLMPaddedElement", mathMLMPaddedElementAttributes = {
				extends: ["ElementAttributes.MathMLElementAttributes"],
				properties: new Map(),
			});
			// https://w3c.github.io/mathml-core/#mpadded-attributes
			mathMLMPaddedElementAttributes.properties.set(`"attr:width"`, "string" + orNull);
			mathMLMPaddedElementAttributes.properties.set(`"attr:height"`, "string" + orNull);
			mathMLMPaddedElementAttributes.properties.set(`"attr:depth"`, "string" + orNull);
			mathMLMPaddedElementAttributes.properties.set(`"attr:lspace"`, "string" + orNull);
			mathMLMPaddedElementAttributes.properties.set(`"attr:voffset"`, "string" + orNull);
		}

		{
			let mathMLMSpaceElementAttributes = interfaces.get("MathMLMSpaceElement");
			if (!mathMLMSpaceElementAttributes) interfaces.set("MathMLMSpaceElement", mathMLMSpaceElementAttributes = {
				extends: ["ElementAttributes.MathMLElementAttributes"],
				properties: new Map(),
			});
			// https://w3c.github.io/mathml-core/#mspace-attributes
			mathMLMSpaceElementAttributes.properties.set(`"attr:width"`, "string" + orNull);
			mathMLMSpaceElementAttributes.properties.set(`"attr:height"`, "string" + orNull);
			mathMLMSpaceElementAttributes.properties.set(`"attr:depth"`, "string" + orNull);
		}

		{
			let mathMLMUnderOverElementAttributes = interfaces.get("MathMLMUnderOverElement");
			if (!mathMLMUnderOverElementAttributes) interfaces.set("MathMLMUnderOverElement", mathMLMUnderOverElementAttributes = {
				extends: ["ElementAttributes.MathMLElementAttributes"],
				properties: new Map(),
			});
			// https://w3c.github.io/mathml-core/#munderover-attributes
			mathMLMUnderOverElementAttributes.properties.set(`"attr:accent"`, booleanish + orNull);
			mathMLMUnderOverElementAttributes.properties.set(`"attr:accentunder"`, booleanish + orNull);
		}

		{
			let mathMLMTableCellElementAttributes = interfaces.get("MathMLMTableCellElement");
			if (!mathMLMTableCellElementAttributes) interfaces.set("MathMLMTableCellElement", mathMLMTableCellElementAttributes = {
				extends: ["ElementAttributes.MathMLElementAttributes"],
				properties: new Map(),
			});
			// https://w3c.github.io/mathml-core/#mtd-attributes
			mathMLMTableCellElementAttributes.properties.set(`"attr:columnspan"`, "string" + orNull);
			mathMLMTableCellElementAttributes.properties.set(`"attr:rowspan"`, "string" + orNull);
		}

		{
			let mathMLMFracElementAttributes = interfaces.get("MathMLMFracElement");
			if (!mathMLMFracElementAttributes) interfaces.set("MathMLMFracElement", mathMLMFracElementAttributes = {
				extends: ["ElementAttributes.MathMLElementAttributes"],
				properties: new Map(),
			});
			// https://w3c.github.io/mathml-core/#dfn-linethickness
			mathMLMFracElementAttributes.properties.set(`"attr:linethickness"`, "string" + orNull);
		}

		{
			// https://svgwg.org/svg2-draft/styling.html#PresentationAttributes
			const svgGlobalPresentationAttributeProperties = [
				"alignment-baseline", "baseline-shift", "clip-path", "clip-rule", "color",
				"color-interpolation", "color-interpolation-filters", "cursor", "direction",
				"display", "dominant-baseline", "fill-opacity", "fill-rule", "filter",
				"flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust",
				"font-stretch", "font-style", "font-variant", "font-weight", "glyph-orientation-horizontal",
				"glyph-orientation-vertical", "image-rendering", "letter-spacing", "lighting-color",
				"marker-end", "marker-mid", "marker-start", "mask", "mask-type", "opacity", "overflow",
				"paint-order", "pointer-events", "shape-rendering", "stop-color", "stop-opacity",
				"stroke", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin",
				"stroke-miterlimit", "stroke-opacity", "stroke-width", "text-anchor", "text-decoration",
				"text-overflow", "text-rendering", "transform-origin", "unicode-bidi", "vector-effect",
				"visibility", "white-space", "word-spacing", "writing-mode",
				"fill",
			];
			const svgElementAttributes = interfaces.get("SVGElement");
			for (const property of svgGlobalPresentationAttributeProperties) {
				svgElementAttributes.properties.set(property, "string");
			}

			interfaces.get("SVGPathElement").properties.set("d", "string");
			interfaces.get("SVGAnimatedPoints").properties.set("points", "string");

			await FS.writeFile(
				Path.resolve(import.meta.dirname, "../../winzig/src/generated-data.json"),
				JSON.stringify({
					svgAttributes: [...svgGlobalPresentationAttributeProperties, ...allSVGAnimatedProperties, "d", "points"].sort()
				}, null, "\t"),
			);
		}
	}

	{
		// special winzig attributes:
		interfaces.get("Element").properties.set("class", "string");
	}
}

// for (const [interfaceName, interfaceInfo] of interfaces) {
// 	interfaceInfo.extends &&= interfaceInfo.extends.filter(base => nonEmptyAttributesInterfaces.has(base));
// }

{
	for (const interfaceName of ["HTMLElement", "SVGElement", "MathMLElement"]) {
		const info = interfaces.get(interfaceName);
		info.extends = info.extends.filter(base => base !== "ElementAttributes.GlobalEventHandlersAttributes");
	}
	interfaces.get("Element").extends.push("WinzigTypes.GlobalSpecialAttributes");
	interfaces.get("Element").extends.push("WinzigTypes.GlobalEventHandlers");
	interfaces.get("Element").extends.push("WinzigTypes.ElementEventHandlers");
	interfaces.get("Element").properties.delete("onfullscreenchange");
	interfaces.get("Element").properties.delete("onfullscreenerror");
	interfaces.get("HTMLMediaElement").extends.push("WinzigTypes.HTMLMediaElementEventHandlers");
	interfaces.get("HTMLMediaElement").properties.delete("onencrypted");
	interfaces.get("HTMLMediaElement").properties.delete("onwaitingforkey");
	interfaces.get("HTMLVideoElement").extends.push("WinzigTypes.HTMLVideoElementEventHandlers");
	interfaces.get("HTMLVideoElement").properties.delete("onenterpictureinpicture");
	interfaces.get("HTMLVideoElement").properties.delete("onleavepictureinpicture");
}

const listFormatter = new Intl.ListFormat("en-GB", {
	style: "long",
	type: "conjunction",
});

for (const [property, propertyInfo] of allPropertiesMap) {
	if (
		propertyInfo.definitions.has("string")
		&& propertyInfo.definitions.size >= 2
		&& [...propertyInfo.definitions].some(definition => definition !== "number" && definition !== "string")
	) {
		// make strings autocompletable (see https://medium.com/@florian.schindler_47749/typescript-hacks-1-string-suggestions-58806363afeb)
		propertyInfo.definitions.add("(string & {})");
		propertyInfo.definitions.delete("string");
	}
}

const createJSDocLine = ({ deprecated = false, validFor }: { deprecated?: boolean, validFor: Iterable<string>; }) =>
	`\t/**${deprecated ? " @deprecated" : ""} Valid for ${(
		listFormatter.format(
			[...validFor].map(interfaceName => `{@link ${interfaceName}|\`${interfaceName}\`}`)
		)
	)}. */`;

const createTagNameMappings = (tagNames: [string, string][]) => (tagNames
	.map(([name, interfaceName]) => `\t${(
		(tagNames === svgTagNames && svgElementsCollidingWithHTML.has(name))
			? `"svg:${name}"`
			: toSafePropertyName(name)
	)}: ElementAttributes.${interfaceName}Attributes;`)
);

const result = [
	``,
	`// DO NOT EDIT THIS FILE DIRECTLY!`,
	`// This file was automatically generated via ./scripts/generate-interfaces.ts`,
	``,
	`/// <reference lib="ESNext" />`,
	`/// <reference lib="DOM" />`,
	`/// <reference lib="DOM.Iterable" />`,
	`/// <reference lib="DOM.AsyncIterable" />`,
	``,
	`/// <reference path="./main.d.ts" />`,
	``,
	`import type * as WinzigTypes from "./main.d.ts";`,
	``,
	`interface HTMLTagNameToAttributesMap {`,
	...createTagNameMappings(htmlTagNames),
	`}`,
	``,
	`interface SVGTagNameToAttributesMap {`,
	...createTagNameMappings(svgTagNames),
	`}`,
	``,
	`interface MathMLTagNameToAttributesMap {`,
	...createTagNameMappings(mathMLTagNames),
	`}`,
	``,
	`export interface TagNameToAttributesMap extends HTMLTagNameToAttributesMap, SVGTagNameToAttributesMap, MathMLTagNameToAttributesMap { }`,
	``,
	`export declare namespace ElementAttributes {`,
	// `\tinterface HTMLElementAttributes extends WinzigTypes.HTMLElementAttributes {`,
	// `\t}`,
	// ``,
	[...interfaces]
		.sort(([name1], [name2]) => name1 > name2 ? 1 : -1)
		.map(([name, info]) => [
			`\tinterface ${name}Attributes${info.extends?.length
				? ` extends ${info.extends.join(", ")}`
				: ""
			} {`,
			...[...info.properties]
				.sort(([name1], [name2]) => name1 > name2 ? 1 : -1)
				.map(([property, definition]) => `\t\t${toSafePropertyName(property)}?: ${definition};`),
			`\t}`,
		].join("\n"))
		.join("\n\n"),
	`}`,
	``,
	`export interface WinzigGenericElement extends Element {`,
	...[...allPropertiesMap]
		.sort(([name1], [name2]) => name1 > name2 ? 1 : -1)
		.map(([name, info]) => [
			createJSDocLine(info),
			`\t${info.readonly ? "readonly " : ""}${name}: ${[...info.definitions].join(" | ")};`,
		].join("\n")),
	...[...allMethodsMap]
		.sort(([name1], [name2]) => name1 > name2 ? 1 : -1)
		.map(([name, info]) => [...info.overloads].map(overload => [
			createJSDocLine(info),
			`\t${overload};`,
		].join("\n")).join("\n")),
	createJSDocLine({ validFor: ["HTMLSelectElement"] }),
	`\t[name: number]: HTMLOptionElement | HTMLOptGroupElement;`,
	createJSDocLine({ validFor: ["HTMLSelectElement"] }),
	`\t[Symbol.iterator](): ArrayIterator<HTMLOptionElement>;`,
	`}`,
	``,
].join("\n");

// console.log(formProperties);

FS.writeFile(Path.resolve(import.meta.dirname, "../generated.d.ts"), result);
