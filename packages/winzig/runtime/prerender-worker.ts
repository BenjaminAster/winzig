
import { parentPort, workerData } from "node:worker_threads";
import * as Path from "node:path";
import * as NodeURL from "node:url";
import * as FS from "node:fs/promises";

import * as HappyDOM from "@benjaminaster/bundled-happy-dom";
// import * as HappyDOM from "happy-dom/lib/index.js";

// import "entities";
// import "whatwg-mimetype";

// import * as HappyDOM from "happy-dom";

import "fake-indexeddb/auto";
import addWinzigHTML from "./add-winzig-html.ts";

const fakeWindow = new HappyDOM.Window({
	settings: {
		disableComputedStyleRendering: true,
		disableCSSFileLoading: true,
		disableJavaScriptEvaluation: true,
		disableJavaScriptFileLoading: true,
		navigator: {
			userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/199.0.0.0 Safari/537.36"
		},
		device: {
			prefersColorScheme: "dark",
		},
	},
	url: "http://localhost/",
});

for (let key of Object.getOwnPropertyNames(fakeWindow)) {
	if (key in globalThis) continue;
	Object.defineProperty(globalThis, key, {
		value: (fakeWindow as any)[key],
		configurable: true,
		enumerable: true,
		writable: true,
	});
}

for (const globalThisAlias of ["frames", "parent", "self", "top", "window"]) {
	Object.defineProperty(globalThis, globalThisAlias, {
		value: globalThis,
		configurable: true,
		enumerable: true,
		writable: true,
	});
}

if (workerData.logLevel !== "verbose") {
	let property: keyof Console;
	for (property in console) {
		if (typeof console[property] === "function") {
			console[property] = (() => { }) as any;
		}
	}
}

Object.defineProperty(globalThis, "navigator", {
	value: fakeWindow.navigator,
	configurable: true,
	enumerable: true,
	writable: true,
});

parentPort.on("message", async (data) => {
	if (data.type === "run") {
		const originalFetch = globalThis.fetch;

		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			if (typeof input === "string" && input.startsWith("file://")) {
				const path = Path.resolve(data.absoluteAppfilesFolderPath, Path.relative(data.prerenderFolder, NodeURL.fileURLToPath(input)));
				const content = await FS.readFile(path, { encoding: "utf-8" });
				return {
					async text() {
						return content;
					}
				};
			} else {
				return await originalFetch(input, init);
			}
		}) as any;

		// const { setBuildData } = await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./winzig-runtime.js")).href);

		// setBuildData(data);
		// await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./index.js")).href);

		// // @ts-ignore
		// globalThis.__winzig__ = {
		// 	finish() {
		// 		setTimeout(() => {
		// 			addWinzigHTML({ document, Text }, {
		// 				...data,
		// 				pretty: workerData.pretty,
		// 			});
		// 			parentPort.postMessage({
		// 				type: "send-html",
		// 				html: `<!DOCTYPE html>\n${document.documentElement.outerHTML}`,
		// 			});
		// 		});
		// 	},
		// };

		await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./winzig-runtime.js")).href);
		await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./index.js")).href);

		queueMicrotask(() => {
			addWinzigHTML({ document, Text }, {
				...data,
				pretty: workerData.pretty,
			});
			parentPort.postMessage({
				type: "send-html",
				html: `<!DOCTYPE html>\n${document.documentElement.outerHTML}`,
			});
		});
	}
});
