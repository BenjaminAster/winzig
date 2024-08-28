
import { parentPort, workerData } from "node:worker_threads";
import * as Path from "node:path";

import * as NodeURL from "node:url";

// import { JSDOM } from "jsdom";

import * as HappyDOM from "happy-dom";

// // Super dumb hack to disable JSDOM's outdated CSS parser that is stuck in the stone age of CSS and can't be disabled
// // https://github.com/jsdom/jsdom/issues/2005
// // @ts-ignore
// import { implementation as JSDOMHTMLStyleElementImplementation } from "jsdom/lib/jsdom/living/nodes/HTMLStyleElement-impl.js";
// if (!JSDOMHTMLStyleElementImplementation.prototype._updateAStyleBlock)
// 	throw new Error("JSDOM's internal implementation of the HTMLStyleElement interface has been changed!");
// JSDOMHTMLStyleElementImplementation.prototype._updateAStyleBlock = () => { };

// import { indexedDB } from "fake-indexeddb";
import "fake-indexeddb/auto";

import * as FS from "node:fs/promises";

let setBuildData: any;

let patchedGlobalPropertyKeys: Set<string>;

parentPort.on("message", async (data) => {
	if (data.type === "run") {
		// const fakeDOM = new JSDOM("<!DOCTYPE html>", {});
		// const fakeWindow = fakeDOM.window;

		const fakeWindow = new HappyDOM.Window({
			settings: {
				disableComputedStyleRendering: true,
				disableCSSFileLoading: true,
				disableJavaScriptEvaluation: true,
				disableJavaScriptFileLoading: true,
			},
		});

		if (!patchedGlobalPropertyKeys) {

			// patchedGlobalPropertyKeys = new Set(
			// 	Object.getOwnPropertyNames(fakeWindow)
			// 		.filter(key => !(key in globalThis) && !key.startsWith("_") && !["localStorage", "sessionStorage", "window", "top", "self", "globalThis"].includes(key))
			// );
			patchedGlobalPropertyKeys = new Set(
				Object.getOwnPropertyNames(fakeWindow)
					.filter(key => !(key in globalThis))
			);

			const originalFetch = globalThis.fetch;
			// @ts-ignore
			globalThis.fetch = async (input, init) => {
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
			};

			// globalThis.addEventListener ??= () => { };
			// globalThis.removeEventListener ??= () => { };
			// globalThis.dispatchEvent ??= () => true;

			if (workerData.logLevel !== "verbose") {
				let property: keyof Console;
				for (property in console) {
					if (typeof console[property] === "function") {
						console[property] = (() => { }) as any;
					}
				}
			}

			// Object.defineProperty(globalThis, "window", {
			// 	value: globalThis,
			// 	configurable: true,
			// 	enumerable: true,
			// 	writable: true,
			// });
			// Object.defineProperty(globalThis, "self", {
			// 	value: globalThis,
			// 	configurable: true,
			// 	enumerable: true,
			// 	writable: true,
			// });
			// Object.defineProperty(globalThis, "top", {
			// 	value: globalThis,
			// 	configurable: true,
			// 	enumerable: true,
			// 	writable: true,
			// });

			// Object.defineProperty(globalThis, "localStorage", {
			// 	value: fakeWindow._localStorage,
			// 	configurable: true,
			// 	enumerable: true,
			// 	writable: true,
			// });
			// Object.defineProperty(globalThis, "sessionStorage", {
			// 	value: fakeWindow._sessionStorage,
			// 	configurable: true,
			// 	enumerable: true,
			// 	writable: true,
			// });

			Object.defineProperty(globalThis, "navigator", {
				value: fakeWindow.navigator,
				configurable: true,
				enumerable: true,
				writable: true,
			});

			// Object.defineProperty(globalThis, "indexedDB", {
			// 	value: indexedDB,
			// 	configurable: true,
			// 	enumerable: true,
			// 	writable: true,
			// });
		}

		for (let key of patchedGlobalPropertyKeys) {
			Object.defineProperty(globalThis, key, {
				value: (fakeWindow as any)[key],
				configurable: true,
				enumerable: true,
				writable: true,
			});
		}
		localStorage.clear();
		sessionStorage.clear();

		for (const { name } of await indexedDB.databases()) {
			indexedDB.deleteDatabase(name);
		}


		// globalThis.indexedDB = indexedDB;

		// console.log(window.indexedDB, globalThis.indexedDB, 124, indexedDB);

		if (!setBuildData) {
			({ setBuildData } = await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./winzig-runtime.js")).href));
		}

		setBuildData(data);
		await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./index.js")).href + "?" + Date.now());
	}
})

