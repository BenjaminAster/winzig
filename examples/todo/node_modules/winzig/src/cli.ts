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

// console.log(babelPresetTypeScript.default);

// const typescript = typescriptModule.default;
// console.log(typescript);

import * as fs from "node:fs/promises";

import * as path from "node:path";
// import * as url from "node:url";


// console.log("Hello, world!");

// console.log(rollup);


// console.log(new URL("../../../examples/todo/src/index.tsx", import.meta.url))

// const resolve = (url: string, base: string) => decodeURI(new URL(url, base).pathname);
// console.log(resolve("./", import.meta.url), resolve("../../../examples/todo/src/index.tsx", import.meta.url));

// console.log(path.resolve("../../../examples/todo/src/index.tsx", import.meta.dirname));
// console.log(path.resolve(import.meta.dirname, "../../../examples/todo/src/index.tsx"));
// console.log(import.meta.dirname);

const build = await rollup({
	input: {
		// "winzig/jsx-runtime": "./testtest.js",
		"index.123abc": path.resolve(import.meta.dirname, "../../../examples/todo/src/index.tsx"),
		"winzig/jsx-runtime.123abc": path.resolve(import.meta.dirname, "./jsx-runtime/index.js"),
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
			mangle: {
				// reserved: ["x", "y"],
			},
			ecma: 2020,
			// sourceMap: {
			// 	// content: output.map as any,
			// },
		}),
	],
	logLevel: "debug",
});

const { output } = await build.generate({
	compact: true,
	// dir: "../../examples/todo/built/",
	// esModule: true,
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
});

await build.close();

// console.log(output);

// console.log(output);
// const { code } = output;
// console.log(code);

// const minified = await terser.minify([code], {
// });

// const minified = output;

// console.log(minified, minified.map);

// const minifiedCode = minified.code + "\n//# sourceMappingURL=index.js.map";

// console.log(process.argv.slice(2), new URL("./asdf.js", import.meta.url).href, process.cwd());

await fs.mkdir("../../examples/todo/appfiles/", { recursive: true });
await Promise.all((await fs.readdir("../../examples/todo/appfiles/", { withFileTypes: true })).map(async entry => {
	await fs.rm(path.join("../../examples/todo/appfiles/", entry.name), { force: true, recursive: true });
}));
await fs.mkdir("../../examples/todo/appfiles/winzig/", { recursive: true });

for (const entry of output) {
	// @ts-ignore
	await fs.writeFile(path.join("../../examples/todo/appfiles/", entry.fileName), entry.code ?? entry.source, { encoding: "utf-8" });
}

// await fs.writeFile("../../examples/todo/appfiles/index.123abc.js", output.code, { encoding: "utf-8" });
// await fs.writeFile("../../examples/todo/appfiles/index.123abc.js.map", output.map.toString(), { encoding: "utf-8" });
