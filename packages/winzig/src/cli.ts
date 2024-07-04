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

import * as terser from "terser";

import * as fs from "node:fs/promises";

import * as path from "node:path";

// console.log("Hello, world!");

// console.log(rollup);

const build = await rollup({
	input: {
		"a": "../../examples/todo/src/index.js",
	},
	logLevel: "debug",
});

const { output: [output] } = await build.generate({
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
});

await build.close();

// console.log(output);
const { code } = output;
// console.log(code);

const minified = await terser.minify([code], {
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
	sourceMap: {
		content: output.map as any,
	},
});

// console.log(minified, minified.map);

const minifiedCode = minified.code + "\n//# sourceMappingURL=index.js.map";

await fs.mkdir("../../examples/todo/appfiles/", { recursive: true });
await Promise.all((await fs.readdir("../../examples/todo/appfiles/", { withFileTypes: true })).map(async entry => {
	await fs.rm(entry.path, { force: true, recursive: true });
}));

await fs.writeFile("../../examples/todo/appfiles/index.js", minifiedCode, { encoding: "utf-8" });
await fs.writeFile("../../examples/todo/appfiles/index.js.map", minified.map as string, { encoding: "utf-8" });
