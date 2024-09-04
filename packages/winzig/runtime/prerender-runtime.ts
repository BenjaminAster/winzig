
/// <reference path="./internal-types.d.ts" />

import {
	j as originalJsx,
	V as LiveVariable,
	e as liveExpression,
	l as addListeners,
	A as liveArray,
	c as createElement,
} from "$appfiles/winzig-original-runtime.js";

import { parentPort, workerData } from "node:worker_threads";
import addWinzigHTML from "./add-winzig-html.ts";

let buildData: any;

export const setBuildData = (data: any) => buildData = data;

const elementsThatNeedSpecialAttributeHandling = new Set(["meta", "link"]);

const jsx = (elementOrFunction: any, params: any, ...children: any[]) => {
	if (workerData.pretty && elementOrFunction === document.head) children = children.flatMap(child => [child, "\n"]);

	for (let i = 0; i < children.length; ++i) {
		let child = children[i];
		if (typeof child === "number" || typeof child === "boolean") children[i] = children[i].toString();
	}
	const element = originalJsx(elementOrFunction, params, ...children);
	if (typeof elementOrFunction.localName === "string" && elementsThatNeedSpecialAttributeHandling.has(elementOrFunction.localName)) {
		if (params.sizes) element.setAttribute("sizes", params.sizes);
		if (params.property) element.setAttribute("property", params.property);
	}
	if (elementOrFunction === document.body) {
		setTimeout(() => {
			addWinzigHTML({ document, Text }, {
				...buildData,
				pretty: workerData.pretty,
			});
			parentPort.postMessage({
				type: "send-html",
				html: `<!DOCTYPE html>\n${document.documentElement.outerHTML}`,
			});
		});
	}
	return element;
};

export {
	jsx as j,
	LiveVariable as V,
	liveExpression as e,
	addListeners as l,
	liveArray as A,
	createElement as c,
};
