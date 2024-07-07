#!/usr/bin/env node

import {
	transformAsync,
	transformFileAsync,
	transformFromAstAsync,
	parseAsync,
	loadOptions,
	loadPartialConfigAsync,
	resolvePlugin,
	resolvePreset,
	createConfigItem,
} from "@babel/core";

import { rollup } from "rollup";

// import * as terser from "terser";

import terser from "@rollup/plugin-terser";
// import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";
import babelPluginTransformTypescript from "@babel/plugin-transform-typescript";
import babelPluginJsxDomExpressions from "babel-plugin-jsx-dom-expressions";
import babelPluginTransformReactJsx from "@babel/plugin-transform-react-jsx";
// import babelPluginTransformReactJsx from "@babel/plugin-transform-react-jsx-self";

import babelPresetTypeScript from "@babel/preset-typescript";

import { JSDOM } from "jsdom";

import * as fs from "node:fs/promises";

import * as path from "node:path";

const build = await rollup({
	input: {
		// "winzig/jsx-runtime": "./testtest.js",
		"index": path.resolve(process.cwd(), "./src/index.tsx"),
		"winzig/jsx-runtime": path.resolve(import.meta.dirname, "./jsx-runtime/index.js"),
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
				// 		console.log(prop);
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

await fs.mkdir(path.resolve(process.cwd(), "./appfiles/"), { recursive: true });
await Promise.all((await fs.readdir(path.resolve(process.cwd(), "./appfiles/"), { withFileTypes: true })).map(async entry => {
	await fs.rm(path.join(path.resolve(process.cwd(), "./appfiles/"), entry.name), { force: true, recursive: true });
}));
await fs.mkdir(path.resolve(process.cwd(), "./appfiles/winzig/"), { recursive: true });

let importMap = new Map<string, string>();
let entryFilePath: string;
let modulePreloadPaths: string[] = [];

for (const file of output) {
	await fs.writeFile(
		path.resolve(process.cwd(), path.join("./appfiles/", file.fileName)),
		file.type === "chunk" ? file.code : file.source,
		{ encoding: "utf-8" }
	);

	if (file.type === "chunk") {
		importMap.set(`$appfiles/${file.name}.js`, `./appfiles/${file.fileName}`);
		if (file.name === "index") {
			entryFilePath = `./appfiles/${file.fileName}`;
		} else {
			modulePreloadPaths.push(`./appfiles/${file.fileName}`);
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

	await fs.writeFile(path.resolve(process.cwd(), "./index.html"), `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, { encoding: "utf-8" });
}
