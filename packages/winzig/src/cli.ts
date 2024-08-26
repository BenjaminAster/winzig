#!/usr/bin/env node

import { init } from "./main.ts";

import { parseArgs, styleText } from "node:util";

import * as Path from "node:path";
import * as FS from "node:fs/promises";

try {
	var { values: cmdArgs, positionals } = parseArgs({
		allowPositionals: true,
		args: process.argv.slice(2),
		options: {
			watch: {
				type: "boolean",
				default: false,
				short: "w",
			},
			output: {
				type: "string",
				short: "o",
			},
			appfiles: {
				type: "string",
			},
			pretty: {
				type: "boolean",
				default: false,
			},
			"live-reload": {
				type: "boolean",
				default: false,
			},
			dev: {
				type: "boolean",
				default: false,
				short: "d",
			},
			"no-prerender": {
				type: "boolean",
				default: false,
			},
			"keep-prerender-folder": {
				type: "boolean",
				default: false,
			},
			help: {
				type: "boolean",
				default: false,
			},
			"log-level": {
				type: "string",
				default: "normal",
			},
		},
		strict: true,
		tokens: true,
	});
} catch (error) {
	console.error("Invalid CLI argument passed");
	throw error;
}

const appfilesFolderPath = cmdArgs.appfiles;
const outputFolderPath = cmdArgs.output;
const devMode = cmdArgs.dev;
const minify = !devMode && !cmdArgs.pretty;
const watch = devMode || cmdArgs.watch;
const liveReload = devMode || (watch && cmdArgs["live-reload"]);
const keepPrerenderFolder = cmdArgs["keep-prerender-folder"];
const prerender = !devMode && !cmdArgs["no-prerender"];
const logLevel = cmdArgs["log-level"];

if (cmdArgs.help) {
	console.info(
		styleText(["green"], "💡 Please see ")
		+ styleText(["green", "underline"], "https://github.com/BenjaminAster/winzig#cli-options")
		+ styleText(["green"], " for help.")
	);
} else if (positionals[0] === "create") {
	const templateDir = Path.resolve(import.meta.dirname, "../templates/default/");
	await FS.cp(templateDir, process.cwd(), { recursive: true });
} else {
	init({
		appfilesFolderPath,
		liveReload,
		minify,
		outputFolderPath,
		watch,
		keepPrerenderFolder,
		prerender,
		workingDirectory: process.cwd(),
		logLevel,
	});
}
