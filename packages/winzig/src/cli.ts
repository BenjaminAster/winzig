#!/usr/bin/env node

import { rollup } from "rollup";

import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";
import babelPluginTransformReactJsx from "@babel/plugin-transform-react-jsx";

import babelPresetTypeScript from "@babel/preset-typescript";

import { JSDOM } from "jsdom";

import * as fs from "node:fs/promises";

import * as path from "node:path";

const cmdArgs = new Map<string, string | boolean>();
const cmdArgsSingleLetterAliases = {
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
const outputFolderPath = cmdArgs.get("output") as string || "./build/";

const buildProject = async () => {
	const build = await rollup({
		input: {
			// "winzig/jsx-runtime": "./testtest.js",
			"index": path.resolve(process.cwd(), "./src/index.tsx"),
			"winzig/jsx-runtime": path.resolve(import.meta.dirname, "../src/jsx-runtime/index.ts"),
		},
		external: ["winzig/jsx-runtime"],
		plugins: [
			babel({
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
						// pragma: "createElement",
						// pragmaFrag: "Fragment",
					}],
					// babelPluginJsxDomExpressions,
					// babelPluginTransformTypescript,
				],
			}),
			terser({
				module: true,
				compress: {
					passes: 3,
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

	const { output } = await build.generate({
		compact: true,
		sourcemap: true,
		sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
			return path.posix.join("../", relativeSourcePath);
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
			"winzig/jsx-runtime": "$appfiles/winzig/jsx-runtime.js",
		},
		chunkFileNames: "[name].[hash:8].js",
		entryFileNames: "[name].[hash:8].js",
		hashCharacters: "base36",
	});

	await build.close();

	const absoluteAppfilesFolderPath = path.resolve(process.cwd(), outputFolderPath, appfilesFolderPath);
	await fs.mkdir(absoluteAppfilesFolderPath, { recursive: true });
	await Promise.all((await fs.readdir(absoluteAppfilesFolderPath, { withFileTypes: true })).map(async entry => {
		await fs.rm(path.join(absoluteAppfilesFolderPath, entry.name), { force: true, recursive: true });
	}));
	await fs.mkdir(path.resolve(absoluteAppfilesFolderPath, "./winzig/"), { recursive: true });

	let importMap = new Map<string, string>();
	let entryFilePath: string;
	let modulePreloadPaths: string[] = [];

	for (const file of output) {
		await fs.writeFile(
			path.resolve(absoluteAppfilesFolderPath, file.fileName),
			file.type === "chunk" ? file.code : file.source,
			{ encoding: "utf-8" }
		);

		if (file.type === "chunk") {
			importMap.set(`$appfiles/${file.name}.js`, "./" + path.posix.join(appfilesFolderPath, file.fileName));
			if (file.name === "index") {
				entryFilePath = "./" + path.posix.join(appfilesFolderPath, file.fileName);
			} else {
				modulePreloadPaths.push("./" + path.posix.join(appfilesFolderPath, file.fileName));
			}
		}
	}

	{
		const html = await fs.readFile(path.resolve(process.cwd(), "./src/index.html"), { encoding: "utf-8" });
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
		doc.head.append("\n");

		doc.documentElement.prepend("\n");
		doc.documentElement.append("\n");

		await fs.writeFile(path.resolve(process.cwd(), outputFolderPath, "./index.html"), `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, { encoding: "utf-8" });
	}
};

await buildProject();
console.info("Built!");

if (cmdArgs.get("watch")) {
	console.info(`Watching for file changes in ${path.resolve(process.cwd(), "./src/").replaceAll("\\", "/")}...`);
	(async () => {
		let lastChangeTime = 0;
		for await (const { filename, eventType } of fs.watch(path.resolve(process.cwd(), "./src/"), { recursive: true })) {
			if (performance.now() - lastChangeTime < 500) continue;
			lastChangeTime = performance.now();
			if (eventType === "change") {
				console.info(`File change detected (${filename.replaceAll("\\", "/")}), rebuilding...`);
			} else if (eventType === "rename") {
				console.info(`File rename detected (${filename.replaceAll("\\", "/")}), rebuilding...`);
			}
			await buildProject();
			console.info("Rebuilt!");
		}
	})();
}
