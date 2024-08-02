#!/usr/bin/env node

import { rollup } from "rollup";

import type * as BabelCoreNamespace from "@babel/core";
import type * as BabelTypesNamespace from "@babel/types";
type Babel = typeof BabelCoreNamespace;
type BabelTypes = typeof BabelTypesNamespace;
type PluginObj = BabelCoreNamespace.PluginObj;

import rollupPluginTerser from "@rollup/plugin-terser";
import rollupPluginBabel from "@rollup/plugin-babel";

/// <reference path="./types.d.ts" />
import babelPluginTransformReactJsx from "@babel/plugin-transform-react-jsx";
import babelPresetTypeScript from "@babel/preset-typescript";

import { JSDOM } from "jsdom";

import * as FS from "node:fs/promises";

import * as Path from "node:path";

const cmdArgs = new Map<string, string | boolean>();
const cmdArgsSingleLetterAliases: Record<string, string> = {
	w: "watch",
	o: "output",
};

const standaloneCmdArgs: string[] = [];
for (let i = 2; i < process.argv.length; i++) {
	let arg = process.argv[i];
	if (process.argv[i + 1]?.startsWith(".")) {
		arg += process.argv[++i];
	}
	if (arg.startsWith("-")) {
		let [key, value = true] = arg.split("=");
		if (key.startsWith("--")) {
			key = key.slice(2);
		} else {
			key = key.slice(1);
			if (key in cmdArgsSingleLetterAliases) {
				key = cmdArgsSingleLetterAliases[key];
			}
		}
		cmdArgs.set(key, value);
	} else {
		standaloneCmdArgs.push(arg);
	}
}

const appfilesFolderPath = cmdArgs.get("appfiles") as string || "./appfiles/";
const outputFolderPath = cmdArgs.get("output") as string || "./";

// #region Babel Plugin

// https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
const babelPluginWinzig = (babel: Babel): PluginObj => {
	// for (const key in babel) {
	// 	console.log(key);
	// }
	return {
		visitor: {
			
		},
		// pre: (arg) => {
		// 	console.log("-------")
		// 	for (const key in arg) {
		// 		console.log(key);
		// 	}
		// 	console.log(JSON.stringify(arg.ast));
		// 	// console.log("pre called with args", args.length);
		// },

	};
	// babel.
	// console.log(babel);
	// throw new Error("not implemented");
};
// #endregion

// #region Builder
const buildProject = async () => {
	const build = await rollup({
		input: {
			// "winzig/jsx-runtime": "./testtest.js",
			"index": Path.resolve(process.cwd(), "./src/index.tsx"),
			"winzig-runtime": Path.resolve(import.meta.dirname, "../runtime/index.ts"),
			// "winzig": path.resolve(import.meta.dirname, "../runtime/all.ts"),
		},
		external: ["winzig/jsx-runtime", "winzig"],
		plugins: [
			rollupPluginBabel({
				presets: [
					[babelPresetTypeScript, {}],
					// "@babel/preset-typescript",
					// babelPresetTypeScript.default,
				],
				extensions: [".js", ".ts", ".tsx", ".jsx"],
				babelHelpers: "bundled",
				plugins: [
					// [babelPluginTransformReactJsx, new Proxy({}, {
					// 	get(target, prop) {
					// 	}
					// })],
					[babelPluginTransformReactJsx, {
						runtime: "automatic",
						importSource: "winzig",
						throwIfNamespace: false,
						// useSpread: true,
						// useBuiltIns: true,
						// pragma: "createElement",
						// pragmaFrag: "Fragment",
					}],
					[babelPluginWinzig, { a: 42, b: "hello" }],
					// babelPluginJsxDomExpressions,
					// babelPluginTransformTypescript,
				],
				// ast: true,
				// parserOpts: {
				// 	plugins: []
				// }
			}),
			rollupPluginTerser({
				module: true,
				compress: {
					passes: 1,
					unsafe_math: true,
				},
				format: {
					wrap_func_args: false,
					wrap_iife: false,
				},
				ecma: 2020,
				sourceMap: true,
			}),
		],
		logLevel: "debug",
	});

	// console.log(build);

	const { output } = await build.generate({
		compact: true,
		sourcemap: true,
		sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
			return Path.posix.join("../", relativeSourcePath);
		},
		generatedCode: {
			preset: "es2015",
			arrowFunctions: true,
			constBindings: true,
			objectShorthand: true,
			reservedNamesAsProps: true,
			symbols: true,
		},
		paths: {
			"winzig/jsx-runtime": "$appfiles/winzig-runtime.js",
			"winzig": "$appfiles/winzig-runtime.js",
		},
		chunkFileNames: "[name].[hash:8].js",
		entryFileNames: "[name].[hash:8].js",
		hashCharacters: "base36",
	});

	await build.close();

	// console.log(output);

	const absoluteAppfilesFolderPath = Path.resolve(process.cwd(), outputFolderPath, appfilesFolderPath);
	await FS.mkdir(absoluteAppfilesFolderPath, { recursive: true });
	await Promise.all((await FS.readdir(absoluteAppfilesFolderPath, { withFileTypes: true })).map(async entry => {
		await FS.rm(Path.join(absoluteAppfilesFolderPath, entry.name), { force: true, recursive: true });
	}));

	let importMap = new Map<string, string>();
	let entryFilePath: string;
	let modulePreloadPaths: string[] = [];

	for (const file of output) {
		await FS.writeFile(
			Path.resolve(absoluteAppfilesFolderPath, file.fileName),
			file.type === "chunk" ? file.code : file.source,
			{ encoding: "utf-8" }
		);

		if (file.type === "chunk") {
			importMap.set(`$appfiles/${file.name}.js`, "./" + Path.posix.join(appfilesFolderPath, file.fileName));
			if (file.name === "index") {
				entryFilePath = "./" + Path.posix.join(appfilesFolderPath, file.fileName);
			} else {
				modulePreloadPaths.push("./" + Path.posix.join(appfilesFolderPath, file.fileName));
			}
		}
	}

	{
		const html = await FS.readFile(Path.resolve(process.cwd(), "./src/index.html"), { encoding: "utf-8" });
		const dom = new JSDOM(html);
		const doc = dom.window.document;
		doc.head.append("\n\t");
		{
			const importMapElement = doc.createElement("script");
			importMapElement.setAttribute("type", "importmap");
			const stringifiedImportMap = JSON.stringify({ imports: Object.fromEntries(importMap) }, null, "\t");
			importMapElement.textContent = `\n\t\t${stringifiedImportMap.replaceAll("\n", "\n\t\t")}\n\t`;
			doc.head.append(importMapElement);
		}
		doc.head.append("\n\t");
		{
			const scriptElement = doc.createElement("script");
			scriptElement.setAttribute("type", "module");
			scriptElement.setAttribute("src", entryFilePath);
			doc.head.append(scriptElement);
		}
		for (const path of modulePreloadPaths) {
			doc.head.append("\n\t");
			const linkElement = doc.createElement("link");
			linkElement.setAttribute("rel", "modulepreload");
			linkElement.setAttribute("href", path);
			doc.head.append(linkElement);
		}
		doc.head.append("\n\t");
		{
			const style = doc.createElement("style");
			style.textContent = [
				`wz-frag {`,
				`	display: contents;`,
				`}`,
			].map(line => "\n\t\t" + line).join("") + "\n\t";
			doc.head.append(style);
		}
		doc.head.append("\n");

		doc.documentElement.prepend("\n");
		doc.documentElement.append("\n");

		await FS.writeFile(Path.resolve(process.cwd(), outputFolderPath, "./index.html"), `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, { encoding: "utf-8" });
	}
};


{
	const startTime = performance.now();
	await buildProject();
	console.info(`Built in ${(performance.now() - startTime).toFixed(1)} ms.`);
}

if (cmdArgs.get("watch")) {
	console.info(`Watching for file changes in ${Path.resolve(process.cwd(), "./src/").replaceAll("\\", "/")}...`);
	(async () => {
		let lastChangeTime = 0;
		for await (const { filename, eventType } of FS.watch(Path.resolve(process.cwd(), "./src/"), { recursive: true })) {
			if (performance.now() - lastChangeTime < 500) continue;
			lastChangeTime = performance.now();
			console.clear();
			console.info(`File ${eventType} detected (./src/${filename.replaceAll("\\", "/")}), rebuilding...`);
			await buildProject();
			console.info(`Rebuilt in ${(performance.now() - lastChangeTime).toFixed(1)} ms.`);
		console.info(`Watching for file changes in ${Path.resolve(process.cwd(), "./src/").replaceAll("\\", "/")}...`);
		}
	})();
}
// #endregion
