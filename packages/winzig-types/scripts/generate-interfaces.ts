
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

const deprecatedHTMLElementInterfaces = [
	"HTMLDirectoryElement",
	"HTMLFontElement",
	"HTMLFrameElement",
	"HTMLFrameSetElement",
	"HTMLMarqueeElement",
	"HTMLParamElement",
];

// const requiredAttributes: Record<string, Set<string>> = {
// 	HTMLInputElement: new Set(["type"]),
// 	HTMLImageElement: new Set(["src", "alt"]),
// };

let tagNames: string[][] = [];

for (const match of domLib.matchAll(
	/^interface (?<name>HTML\w+Element|HTMLHyperlinkElementUtils|PopoverInvokerElement|LinkStyle|HTMLElementTagNameMap) (?:extends (?<baseInterfaces>.+) )?{\n(?<content>(?:    .+\n)+)}/mg
)) {
	const interfaceName = match.groups.name;

	if (interfaceName === "HTMLElementTagNameMap") {
		tagNames = match.groups.content.trim().split("\n").map(line => line.trim().slice(1, -1).split(`": `));
	} else {
		const baseInterfaces = match.groups.baseInterfaces?.split(", ").map(base => `WinzigInternals.ElementAttributes.${base}Attributes`);

		// console.log(interfaceName, baseInterfaces);
		// const baseInterfaces = match.groups.baseInterfaces?.split(", ") ?? [];
		// console.log(interfaceName, baseInterfaces);
		if (deprecatedHTMLElementInterfaces.includes(interfaceName)) continue;
		// let isFormInterface = interfaceName === "HTMLFormElement";

		const interfaceInfo = {
			extends: baseInterfaces,
			properties: new Map<string, string>(),
		};
		interfaces.set(interfaceName, interfaceInfo);

		const members = match.groups.content.replaceAll("\n    ", "\n\t").split(";\n").slice(0, -1);
		for (const member of members) {
			const declarationLine = member.split("\n").at(-1).trim();
			let match: RegExpMatchArray;
			if (match = declarationLine.match(/^(?<isReadonly>readonly )?(?<propertyName>\w+)\??\: (?<definition>.+)$/)) {
				let { propertyName, definition, isReadonly } = match.groups;
				let propertyInfo = allPropertiesMap.get(propertyName);
				if (!propertyInfo) allPropertiesMap.set(propertyName, propertyInfo = {
					definitions: new Set(),
					validFor: new Set(),
					deprecated: true,
					readonly: true,
				});
				const isDeprecated = member.includes("@deprecated");
				if (!isDeprecated) propertyInfo.deprecated = false;
				if (!isReadonly) {
					propertyInfo.readonly = false;
					if (!isDeprecated) interfaceInfo.properties.set(propertyName, definition);
				}
				propertyInfo.validFor.add(interfaceName);
				for (const subDefinition of definition.split(" | ")) propertyInfo.definitions.add(subDefinition);
			} else if (match = declarationLine.match(/^(?<methodName>\w+)[<(]/)) {
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
			} else {
				console.log(`skipped property/method ${declarationLine} (${interfaceName})`);
			}
		}
	}
}

{
	interfaces.get("HTMLMediaElement").extends.push("WinzigInternals.HTMLMediaElementEventHandlers");
	interfaces.get("HTMLMediaElement").properties.delete("onencrypted");
	interfaces.get("HTMLMediaElement").properties.delete("onwaitingforkey");
	interfaces.get("HTMLVideoElement").extends.push("WinzigInternals.HTMLVideoElementEventHandlers");
	interfaces.get("HTMLVideoElement").properties.delete("onenterpictureinpicture");
	interfaces.get("HTMLVideoElement").properties.delete("onleavepictureinpicture");
}

interfaces.delete("HTMLOrSVGElement");

{
	const joinStringTypes = (types: string[]) => types.map(type => JSON.stringify(type)).join(" | ");

	const orStringWithAutocomplete = " | (string & {})";
	interfaces.get("HTMLBodyElement").extends = ["WinzigInternals.ElementAttributes.HTMLElementAttributes"];
	interfaces.get("HTMLLinkElement").properties.set("sizes", "string");
	interfaces.get("HTMLInputElement").properties.set("type", joinStringTypes([
		// https://html.spec.whatwg.org/multipage/input.html#attr-input-type
		"hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local",
		"number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"
	]));
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
	interfaces.get("HTMLMetaElement").properties.set("property", joinStringTypes([
		// https://ogp.me/
		"og:title", "og:type", "og:image", "og:url", "og:audio", "og:description", "og:determiner", "og:locale",
		"og:locale:alternate", "og:site_name", "og:video", "og:image", "og:image:url", "og:image",
		"og:image:secure_url", "og:image:type", "og:image:width", "og:image:height", "og:image:alt", "og:image:alt",
		"og:video", "og:image", "og:audio", "og:type", "og:type", "og:type", "og:type", "og:type", "og:type"
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

const createJSDocLine = ({ deprecated, validFor }: { deprecated: boolean, validFor: Set<string>; }) => `\t\t/**${deprecated ? " @deprecated" : ""} Valid for ${(
	listFormatter.format(
		[...validFor].map(interfaceName => `{@link ${interfaceName}|\`${interfaceName}\`}`)
	)
)}. */`;

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
	`/// <reference path="./index.d.ts" />`,
	``,
	`declare namespace WinzigInternals {`,
	`\tinterface TagNameMap {`,
	...tagNames.map(([name, interfaceName]) => `\t\t${name}: WinzigInternals.ElementAttributes.${interfaceName}Attributes;`),
	`\t}`,
	``,
	`\tnamespace ElementAttributes {`,
	[...interfaces]
		.sort(([name1], [name2]) => name1 > name2 ? 1 : -1)
		.map(([name, info]) => [
			`\t\tinterface ${name}Attributes${info.extends
				? ` extends ${info.extends.join(", ")}`
				: ""
			} {`,
			...[...info.properties]
				.sort(([name1], [name2]) => name1 > name2 ? 1 : -1)
				.map(([property, definition]) => `\t\t\t${property}?: ${definition};`),
			`\t\t}`,
		].join("\n"))
		.join("\n\n"),
	`\t}`,
	``,
	`\tinterface WinzigGenericElement extends HTMLElement {`,
	...[...allPropertiesMap]
		.sort(([name1], [name2]) => name1 > name2 ? 1 : -1)
		.map(([name, info]) => [
			createJSDocLine(info),
			`\t\t${info.readonly ? "readonly " : ""}${name}: ${[...info.definitions].join(" | ")};`,
		].join("\n")),
	...[...allMethodsMap]
		.sort(([name1], [name2]) => name1 > name2 ? 1 : -1)
		.map(([name, info]) => [
			createJSDocLine(info),
			`\t\t${[...info.overloads].join(";\n\t\t")};`,
		].join("\n")),
	`\t\t[name: number]: HTMLOptionElement | HTMLOptGroupElement;`,
	`\t\t[Symbol.iterator](): IterableIterator<HTMLOptionElement>;`,
	`\t}`,
	`}`,
	``,
].join("\n");

// console.log(formProperties);

FS.writeFile(Path.resolve(import.meta.dirname, "../generated.d.ts"), result);
