
import { parentPort } from "node:worker_threads";
import * as Path from "node:path";

import * as NodeURL from "node:url";

import { JSDOM } from "jsdom";

let setBuildData: any;

let patchedGlobalPropertyKeys: Set<string>;

parentPort.on("message", async (data) => {
	if (data.type === "run") {
		const fakeDOM = new JSDOM("<!DOCTYPE html>");
		const fakeWindow = fakeDOM.window;

		if (!patchedGlobalPropertyKeys) {
			patchedGlobalPropertyKeys = new Set(
				Object.getOwnPropertyNames(fakeWindow)
					.filter(key => !(key in globalThis) && !key.startsWith("_") && !["localStorage", "sessionStorage"].includes(key))
			);
		}

		for (let key of patchedGlobalPropertyKeys) {
			Object.defineProperty(globalThis, key, {
				value: fakeWindow[key],
				configurable: true,
				enumerable: true,
				writable: true,
			});
		}

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
		Object.defineProperty(globalThis, "navigator", {
			value: fakeWindow.navigator,
			configurable: true,
			enumerable: true,
			writable: true,
		});

		if (!setBuildData) {
			({ setBuildData } = await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./winzig-runtime.js")).href));
		}

		setBuildData(data);
		await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./index.js")).href + "?" + Date.now());
	}
})

