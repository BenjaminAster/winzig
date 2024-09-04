
import { parentPort, workerData } from "node:worker_threads";
import * as Path from "node:path";
import * as NodeURL from "node:url";
import * as FS from "node:fs/promises";

import * as HappyDOM from "happy-dom";

import "fake-indexeddb/auto";

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

let patchedGlobalPropertyKeys = new Set(
	Object.getOwnPropertyNames(fakeWindow)
		.filter(key => !(key in globalThis))
);

if (workerData.logLevel !== "verbose") {
	let property: keyof Console;
	for (property in console) {
		if (typeof console[property] === "function") {
			console[property] = (() => { }) as any;
		}
	}
}

for (let key of patchedGlobalPropertyKeys) {
	Object.defineProperty(globalThis, key, {
		value: (fakeWindow as any)[key],
		configurable: true,
		enumerable: true,
		writable: true,
	});
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

		const { setBuildData } = await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./winzig-runtime.js")).href);

		setBuildData(data);
		await import(NodeURL.pathToFileURL(Path.resolve(data.prerenderFolder, "./index.js")).href);
	}
});
