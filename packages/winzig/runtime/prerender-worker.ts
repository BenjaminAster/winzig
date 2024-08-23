
import { parentPort, workerData } from "node:worker_threads";
import * as Path from "node:path";

import * as NodeURL from "node:url";

import { JSDOM } from "jsdom";

import { indexedDB } from "fake-indexeddb";

import * as FS from "node:fs/promises";

let setBuildData: any;

let patchedGlobalPropertyKeys: Set<string>;

parentPort.on("message", async (data) => {
	if (data.type === "run") {
		const fakeDOM = new JSDOM("<!DOCTYPE html>");
		const fakeWindow = fakeDOM.window;

		if (!patchedGlobalPropertyKeys) {
			patchedGlobalPropertyKeys = new Set(
				Object.getOwnPropertyNames(fakeWindow)
					.filter(key => !(key in globalThis) && !key.startsWith("_") && !["localStorage", "sessionStorage", "window", "top", "self", "globalThis"].includes(key))
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

			globalThis.addEventListener ??= () => { };
			globalThis.removeEventListener ??= () => { };
			globalThis.dispatchEvent ??= () => true;

			if (workerData.logLevel !== "verbose") {
				let property: keyof Console;
				for (property in console) {
					if (typeof console[property] === "function") {
						console[property] = (() => { }) as any;
					}
				}
			}

			Object.defineProperty(globalThis, "window", {
				value: globalThis,
				configurable: true,
				enumerable: true,
				writable: true,
			});
			Object.defineProperty(globalThis, "self", {
				value: globalThis,
				configurable: true,
				enumerable: true,
				writable: true,
			});
			Object.defineProperty(globalThis, "top", {
				value: globalThis,
				configurable: true,
				enumerable: true,
				writable: true,
			});

			Object.defineProperty(globalThis, "localStorage", {
				value: fakeWindow._localStorage,
				configurable: true,
				enumerable: true,
				writable: true,
			});
			Object.defineProperty(globalThis, "sessionStorage", {
				value: fakeWindow._sessionStorage,
				configurable: true,
				enumerable: true,
				writable: true,
			});

			localStorage.clear();
			sessionStorage.clear();

			Object.defineProperty(globalThis, "navigator", {
				value: fakeWindow.navigator,
				configurable: true,
				enumerable: true,
				writable: true,
			});

			Object.defineProperty(globalThis, "indexedDB", {
				value: indexedDB,
				configurable: true,
				enumerable: true,
				writable: true,
			});
		}

		for (let key of patchedGlobalPropertyKeys) {
			Object.defineProperty(globalThis, key, {
				value: fakeWindow[key],
				configurable: true,
				enumerable: true,
				writable: true,
			});
		}

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

