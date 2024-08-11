
/// <reference path="./internal-types.d.ts" />

import {
	_j as originalJsx,
	_F as FragmentSymbol,
	_S as SlotSymbol,
	_V as LiveVariable,
	_e as liveExpression,
	_l as addListeners,
} from "$appfiles/winzig-original-runtime.js";

import { parentPort } from "node:worker_threads";

let buildData: any;

export const setBuildData = (data: any) => buildData = data;

const jsx = (originalType, params, ...children) => {
	let type = originalType;
	const element = originalJsx(type, params, ...children);
	if (originalType === document.body) {
		setTimeout(() => {
			{
				document.documentElement.prepend("\n");
				document.head.after("\n");
				document.documentElement.append("\n");
				if (!document.querySelector("meta[name='viewport']")) {
					const meta = document.createElement("meta");
					meta.name = "viewport";
					meta.content = "width=device-width, initial-scale=1, interactive-widget=resizes-content, viewport-fit=cover";
					document.head.prepend(meta);
				}
				{
					const meta = document.createElement("meta");
					meta.setAttribute("charset", "UTF-8");
					document.head.prepend(meta);
				}
				{
					const stylesheetLink = document.createElement("link");
					stylesheetLink.rel = "stylesheet";
					stylesheetLink.href = buildData.cssFilePath;
					document.head.append(stylesheetLink);
				}
				{
					const importMapElement = document.createElement("script");
					importMapElement.type = "importmap";
					const stringifiedImportMap = JSON.stringify({ imports: Object.fromEntries(buildData.importMap) });
					importMapElement.textContent = stringifiedImportMap;
					document.head.append(importMapElement);
				}
				{
					const scriptElement = document.createElement("script");
					scriptElement.type = "module";
					scriptElement.src = buildData.entryFilePath;
					document.head.append(scriptElement);
				}
				for (const path of buildData.modulePreloadPaths) {
					const linkElement = document.createElement("link");
					linkElement.rel = "modulepreload";
					linkElement.href = path;
					document.head.append(linkElement);
				}
			}
			parentPort.postMessage({
				type: "send-html",
				html: `<!DOCTYPE html>\n${document.documentElement.outerHTML}`,
			});
		});
	}
	return element;
};

export { 
	jsx as _j,
	FragmentSymbol as _F,
	SlotSymbol as _S,
	LiveVariable as _V,
	liveExpression as _e,
	addListeners as _l,
};
