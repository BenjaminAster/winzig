#!/usr/bin/env node

import { init } from "./main.ts";

const cmdArgs = new Map<string, string | boolean>();
const cmdArgsSingleLetterAliases: Record<string, string> = {
	w: "watch",
	o: "output",
	d: "dev",
};

const standaloneCmdArgs: string[] = [];
for (let i = 2; i < process.argv.length; ++i) {
	let arg = process.argv[i];
	if (arg.startsWith("-")) {
		if (process.argv[i + 1]?.startsWith(".") && arg.endsWith("=")) {
			arg += process.argv[++i];
		}
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

const appfilesFolderPath = cmdArgs.get("appfiles") as string;
const outputFolderPath = cmdArgs.get("output") as string;
const devMode = cmdArgs.has("dev");
const minify = !devMode && !cmdArgs.has("pretty");
const watch = devMode || cmdArgs.has("watch");
const liveReload = devMode || (watch && cmdArgs.has("live-reload"));
const keepPrerenderFolder = cmdArgs.has("keep-prerender-folder");
const prerender = !devMode && !cmdArgs.has("no-prerender");

init({
	appfilesFolderPath,
	liveReload,
	minify,
	outputFolderPath,
	watch,
	keepPrerenderFolder,
	prerender,
});
