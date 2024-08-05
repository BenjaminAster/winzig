#!/usr/bin/env node

import * as FS from "node:fs/promises";
import * as Path from "node:path";
import * as HTTP from "node:http";
import type * as Net from "node:net";
import * as NodeCrypto from "node:crypto";

import * as ESBuild from "esbuild";

import { JSDOM } from "jsdom";

const cmdArgs = new Map<string, string | boolean>();
const cmdArgsSingleLetterAliases: Record<string, string> = {
	w: "watch",
	o: "output",
	d: "dev",
};

const standaloneCmdArgs: string[] = [];
for (let i = 2; i < process.argv.length; i++) {
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

const appfilesFolderPath = cmdArgs.get("appfiles") as string || "./appfiles/";
const outputFolderPath = cmdArgs.get("output") as string || "./";
const devMode = cmdArgs.has("dev");
const minify = !devMode && !cmdArgs.has("pretty");
const watch = devMode || cmdArgs.has("watch");
const liveReload = devMode || (watch && cmdArgs.has("live-reload"));

let refreshPage: () => void;
let webSocketPort: number;

if (liveReload) {
	const magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

	const constructMessage = (message: any): Buffer => {
		const messageBuffer = Buffer.from(JSON.stringify(message), "utf-8");
		const messageLength = messageBuffer.length;

		const shortMessage = messageLength < 126;
		let offset = shortMessage ? 2 : 4;
		const responseBuffer = Buffer.alloc(offset + messageLength);
		responseBuffer[0] = 0b1000_0001;
		if (shortMessage) {
			responseBuffer[1] = messageLength;
		} else {
			responseBuffer[1] = 126;
			responseBuffer.writeUInt16BE(messageLength, 2);
		}
		messageBuffer.copy(responseBuffer, offset);

		return responseBuffer;
	};

	const server = HTTP.createServer();
	server.on("upgrade", (request, socket, head) => {
		if (request.headers.upgrade !== "websocket") return;
		const responseHead = [
			`HTTP/1.1 101 Switching Protocols`,
			`upgrade: websocket`,
			`connection: Upgrade`,
			`sec-websocket-accept: ${NodeCrypto.createHash("sha1").update(request.headers["sec-websocket-key"] + magicString).digest("base64")}`,
		].join("\n") + "\n\n";
		socket.write(responseHead);

		refreshPage = () => socket.write(constructMessage({ type: "refresh-page", }));
	});
	webSocketPort = await new Promise((resolve) => {
		server.listen({ port: 0 }, () => resolve((server.address() as Net.AddressInfo).port));
	});
}

// #region Builder
const absoluteAppfilesFolderPath = Path.resolve(process.cwd(), outputFolderPath, appfilesFolderPath);

const nameHashSeparatorString = "$$";

const winzigRuntimeDirectory = Path.resolve(import.meta.dirname, "../runtime/"); // note that import.meta is relative to `dist`, not `src`.

const esBuildCommonOptions: ESBuild.BuildOptions = {
	packages: "external",
	splitting: false,
	format: "esm",
	outdir: absoluteAppfilesFolderPath,
	sourcemap: "external",
	bundle: true,
	minifyIdentifiers: minify,
	minifyWhitespace: minify,
	metafile: true,
	target: "esnext",
	assetNames: `[name]${nameHashSeparatorString}[hash]`,
	chunkNames: `[name]${nameHashSeparatorString}[hash]`,
	entryNames: `[name]${nameHashSeparatorString}[hash]`,
	write: false,
	color: true,
	tsconfigRaw: {},
	// external: ["winzig", "winzig"],
	alias: {
		"winzig": "$appfiles/winzig-runtime.js",
		"winzig/jsx-runtime": "$appfiles/winzig-runtime.js",
	},
};

const esBuildChunksOptions: ESBuild.BuildOptions = {
	...esBuildCommonOptions,
	entryPoints: [
		{
			in: Path.resolve(process.cwd(), "./src/index.tsx"),
			out: "index",
		},
	],
	inject: [Path.resolve(winzigRuntimeDirectory, "./esbuild-import-proxy.ts")], // note that import.meta is relative to `dist`, not `src`.
	jsx: "transform",
	jsxFactory: "__winzig__jsx",
	jsxFragment: "__winzig__Fragment",
};

const esBuildWinzigRuntimeOptions: ESBuild.BuildOptions = {
	...esBuildCommonOptions,
	entryPoints: [
		{
			in: Path.resolve(winzigRuntimeDirectory, "./index.ts"), // note that import.meta is relative to `dist`, not `src`.
			out: "winzig-runtime",
		},
	],
	...(liveReload ? {
		inject: [Path.resolve(winzigRuntimeDirectory, "./dev-runtime-additions.ts")],
		banner: {
			"js": `let __winzig__webSocketPort = ${webSocketPort};`,
		},
	} : {}),
};

const [chunksBuildContext, winzigRuntimeBuildContext] = await Promise.all([ESBuild.context(esBuildChunksOptions), ESBuild.context(esBuildWinzigRuntimeOptions)]);

const buildProject = async () => {
	await FS.mkdir(absoluteAppfilesFolderPath, { recursive: true });
	await Promise.all((await FS.readdir(absoluteAppfilesFolderPath, { withFileTypes: true })).map(async entry => {
		await FS.rm(Path.join(absoluteAppfilesFolderPath, entry.name), { force: true, recursive: true });
	}));

	const outputFiles: ESBuild.OutputFile[] = [];

	const [chunksBuild, winzigRuntimeBuild] = await Promise.all([chunksBuildContext.rebuild(), winzigRuntimeBuildContext.rebuild()]);
	outputFiles.push(...chunksBuild.outputFiles, ...winzigRuntimeBuild.outputFiles);

	const importMap = new Map<string, string>();
	let entryFilePath: string;
	const modulePreloadPaths: string[] = [];

	for (const file of outputFiles) {
		const originalRelativePath = Path.relative(absoluteAppfilesFolderPath, file.path).replaceAll("\\", "/");;

		const [name, hashPlusExtension] = originalRelativePath.split(nameHashSeparatorString);
		const hash = hashPlusExtension.slice(0, 8).toLowerCase();
		const extension = hashPlusExtension.slice(8);

		const relativePath = `${name}-${hash}${extension}`;

		const contentStringOrByteArray = extension === ".js"
			? (file.text + `//# sourceMappingURL=./${global.encodeURI(relativePath)}.map`)
			: file.contents;

		await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath), contentStringOrByteArray, { encoding: "utf-8" });

		const browserRelativePath = "./" + Path.posix.join(appfilesFolderPath, relativePath);

		if (extension === ".js") {
			importMap.set(`$appfiles/${name}.js`, browserRelativePath);
			if (name === "index") {
				entryFilePath = browserRelativePath;
			} else {
				modulePreloadPaths.push(browserRelativePath);
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

if (watch) {
	console.info(`Watching for file changes in ${Path.resolve(process.cwd(), "./src/").replaceAll("\\", "/")}...`);
	(async () => {
		let lastChangeTime = 0;
		for await (const { filename, eventType } of FS.watch(Path.resolve(process.cwd(), "./src/"), { recursive: true })) {
			if (performance.now() - lastChangeTime < 500) continue;
			lastChangeTime = performance.now();
			console.clear();
			console.info(`File ${eventType} detected (src/${filename.replaceAll("\\", "/")}), rebuilding...`);
			await buildProject();
			console.info(`Rebuilt in ${(performance.now() - lastChangeTime).toFixed(1)} ms.`);
			console.info(`Watching for file changes in ${Path.resolve(process.cwd(), "./src/").replaceAll("\\", "/")}...`);
			if (liveReload) refreshPage?.();
		}
	})();
} else {
	chunksBuildContext.dispose();
	winzigRuntimeBuildContext.dispose();
}
// #endregion
