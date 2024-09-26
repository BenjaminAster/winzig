
/*
node --experimental-strip-types --experimental-default-type=module examples/build-all.ts
*/

import * as FS from "node:fs/promises";
import * as Path from "node:path";
import { styleText } from "node:util";

import { init as _init } from "../packages/winzig/dist/main.js";
const init = _init as typeof import("../packages/winzig").init;

const subfolders = (await FS.readdir(import.meta.dirname, { withFileTypes: true })).filter(item => item.isDirectory());

await FS.writeFile(Path.resolve(import.meta.dirname, "index.html"), [
	`<!DOCTYPE html>`,
	`<html lang="en">`,
	`<meta name="viewport" content="width=device-width, initial-scale=1" />`,
	`<meta name="color-scheme" content="dark light" />`,
	`<style> :root { font-family: system-ui, sans-serif; } </style>`,
	`<title>Winzig Examples</title>`,
	`<h1>Winzig Examples</h1>`,
	`<ul>`,
	...subfolders.map(folder => `<li><a href="./${folder.name}/">${folder.name}</a></li>`),
	`</ul>`
].join("\n"))

for (const item of subfolders) {
	console.log(styleText(["green", "bold"], `Building ${item.name}...`));
	await init({
		logLevel: "verbose",
		directory: Path.join(item.parentPath, item.name),
		minify: false,
		keepPrerenderFolder: true,
	});
	console.log("");
}
