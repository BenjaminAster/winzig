
/// <reference path="./internal-types.d.ts" />

import {
	j as originalJsx,
	s as jsxSlot,
	V as LiveVariable,
	e as liveExpression,
	l as addListeners,
	f as liveFragment,
} from "$appfiles/winzig-original-runtime.js";

import { parentPort, workerData } from "node:worker_threads";
import addWinzigHTML from "./add-winzig-html.ts";

let buildData: any;

export const setBuildData = (data: any) => buildData = data;

const jsx = (type: any, params: any, ...children: any[]) => {
	const element = originalJsx(type, params, ...((workerData.pretty && type === document.head) ? children.flatMap(child => [child, "\n"]) : children));
	if (type === document.body) {
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
	jsxSlot as s,
	LiveVariable as V,
	liveExpression as e,
	addListeners as l,
	liveFragment as f,
};
