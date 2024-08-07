
import * as FS from "node:fs/promises";
import * as Path from "node:path";
import * as HTTP from "node:http";
import type * as Net from "node:net";
import type * as Stream from "node:stream";
import * as NodeCrypto from "node:crypto";

import * as ESBuild from "esbuild";

import { JSDOM } from "jsdom";

import * as BabelParser from "@babel/parser";

import type * as ESTree from "estree";
import * as Terser from "terser";
const terserMinify = Terser.minify as (
	files: Parameters<typeof Terser.minify>[0] | ESTree.Program[],
	options?: (Omit<Terser.MinifyOptions, "ecma" | "parse">
		& { parse?: (Terser.ParseOptions & { spidermonkey?: boolean }), ecma?: number }),
) => Promise<Terser.MinifyOutput>;

import type { EncodedSourceMap } from "@jridgewell/gen-mapping";

import { compileAST } from "./compiler.ts";
import { initialCSS } from "./constants.ts";

let refreshPage: () => void;
let webSocketPort: number;

import type { WinzigOptions } from "../types/main.d.ts";

export const init = async ({
	appfilesFolderPath = "./appfiles/",
	outputFolderPath = "./",
	minify,
	watch,
	liveReload,
}: WinzigOptions) => {

	if (liveReload) {
		const webSocketMagicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

		const sockets = new Set<Stream.Duplex>();

		refreshPage = () => {
			for (const socket of sockets) {
				socket.write(constructMessage({ type: "refresh-page", }));
			}
		};

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
			const acceptKeyPlusMagicString = request.headers["sec-websocket-key"] + webSocketMagicString;
			const responseHead = [
				`HTTP/1.1 101 Switching Protocols`,
				`upgrade: websocket`,
				`connection: Upgrade`,
				`sec-websocket-accept: ${NodeCrypto.createHash("sha1").update(acceptKeyPlusMagicString).digest("base64")}`,
			].join("\n") + "\n\n";
			socket.write(responseHead);

			sockets.add(socket);
			socket.on("close", () => sockets.delete(socket));
			socket.on("error", () => sockets.delete(socket));
		});
		webSocketPort = await new Promise((resolve) => {
			server.listen({ port: 0 }, () => resolve((server.address() as Net.AddressInfo).port));
		});
	}

	const absoluteAppfilesFolderPath = Path.resolve(process.cwd(), outputFolderPath, appfilesFolderPath);

	const nameHashSeparatorString = "$$";

	const winzigRuntimeDirectory = Path.resolve(import.meta.dirname, "../runtime/"); // note that import.meta is relative to `dist`, not `src`.

	const esBuildCommonOptions: ESBuild.BuildOptions = {
		splitting: false,
		format: "esm",
		outdir: absoluteAppfilesFolderPath,
		sourcemap: "external",
		bundle: true,
		minifyWhitespace: minify,
		minifySyntax: minify,
		metafile: true,
		target: "esnext",
		assetNames: `[name]${nameHashSeparatorString}[hash]`,
		chunkNames: `[name]${nameHashSeparatorString}[hash]`,
		entryNames: `[name]${nameHashSeparatorString}[hash]`,
		write: false,
		tsconfigRaw: {},
		external: ["$appfiles/winzig-runtime.js"],
		legalComments: "inline",
		alias: {
			"winzig": "$appfiles/winzig-runtime.js",
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
		// inject: [Path.resolve(winzigRuntimeDirectory, "./esbuild-import-proxy.ts")],
		banner: {
			js: `import { _jsx as __winzig__jsx, _Fragment as __winzig__Fragment, Variable as __winzig__Variable } from "$appfiles/winzig-runtime.js";`,
		},
		jsx: "transform",
		jsxFactory: "__winzig__jsx",
		jsxFragment: "__winzig__Fragment",
		jsxSideEffects: true,
		minifyWhitespace: false,
		minifySyntax: false,
		pure: [],
	};

	const esBuildWinzigRuntimeOptions: ESBuild.BuildOptions = {
		...esBuildCommonOptions,
		entryPoints: [
			{
				in: Path.resolve(winzigRuntimeDirectory, "./index.ts"),
				out: "winzig-runtime",
			},
		],
		...(liveReload ? {
			inject: [Path.resolve(winzigRuntimeDirectory, "./devmode-additions.ts")],
			banner: {
				"js": `let __winzig__webSocketPort = ${webSocketPort};`,
			},
		} : {}),
		minifyIdentifiers: minify,
	};

	const [chunksBuildContext, winzigRuntimeBuildContext] = await Promise.all([ESBuild.context(esBuildChunksOptions), ESBuild.context(esBuildWinzigRuntimeOptions)]);

	const buildProject = async () => {

		0;
		console.time("Bundling");
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

		let previousSourceMap: any;

		console.timeEnd("Bundling");

		let cssSnippets: string[] = [
			initialCSS,
		];

		for (const file of outputFiles) {
			const originalRelativePath = Path.relative(absoluteAppfilesFolderPath, file.path).replaceAll("\\", "/");;

			const [name, hashPlusExtension] = originalRelativePath.split(nameHashSeparatorString);
			const hash = hashPlusExtension.slice(0, 8).toLowerCase();
			const extension = hashPlusExtension.slice(8);

			const relativePath = `${name}-${hash}${extension}`;

			const browserRelativePath = "./" + Path.posix.join(appfilesFolderPath, relativePath);

			let contentStringOrByteArray: string | Uint8Array;

			if (extension === ".js.map") {
				if (name === "winzig-runtime") {
					const sourceMap = JSON.parse(file.text);
					const runtimeFilePathEnds = ["/runtime/index.ts", "/runtime/devmode-additions.ts"];
					for (let i = 0; i < sourceMap.sources.length; ++i) {
						for (const filePathEnd of runtimeFilePathEnds) {
							if (sourceMap.sources[i].endsWith(filePathEnd)) {
								sourceMap.sources[i] = `https://github.com/BenjaminAster/winzig/blob/main/packages/winzig${filePathEnd}`;
							}
						}
					}
					await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath), JSON.stringify(sourceMap, null, "\t"), { encoding: "utf-8" });
				} else {
					previousSourceMap = JSON.parse(file.text);
				}
			} else {
				if (extension === ".js") {
					if (name === "index") {
						entryFilePath = browserRelativePath;
					} else {
						modulePreloadPaths.push(browserRelativePath);
					}

					let code = file.text;
					if (name !== "winzig-runtime") {
						console.time("Parse code");
						const ast = BabelParser.parse(code, {
							plugins: ["estree", "explicitResourceManagement"],
							sourceType: "module",
							attachComment: false,
						}).program as unknown as ESTree.Program;
						console.timeEnd("Parse code");

						console.time("Modify AST");
						const { cssSnippets: newCSSSnippets } = compileAST(ast);
						cssSnippets.push(...newCSSSnippets);
						console.timeEnd("Modify AST");

						console.time("Print code");
						let terserResult = await terserMinify([ast], {
							parse: {
								spidermonkey: true,
							},
							compress: false,
							module: true,
							ecma: 2099, // terser doesn't have an 'esnext' option, but this works fine
							mangle: minify,
							sourceMap: {
								content: previousSourceMap,
								asObject: true,
								includeSources: true,
							},
							output: {
								comments: false,
							},
						});
						code = terserResult.code;
						const map = terserResult.map as EncodedSourceMap;
						await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath) + ".map", JSON.stringify(map, null, "\t"), { encoding: "utf-8" });
						console.timeEnd("Print code");
					}
					contentStringOrByteArray = (code + (name === "winzig-runtime" ? "" : "\n") + `//# sourceMappingURL=./${global.encodeURI(relativePath)}.map`);
					importMap.set(`$appfiles/${name}.js`, browserRelativePath);
				} else {
					contentStringOrByteArray = file.contents;
				}

				await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath), contentStringOrByteArray, { encoding: "utf-8" });
			}
		}

		let cssFilePath: string;
		{
			const [sourceMapFile, cssFile] = (await ESBuild.build({
				stdin: {
					contents: cssSnippets.join("\n"),
					loader: "css",
					sourcefile: "main.css",
					resolveDir: "../.winzig-virtual-fs/",
				},
				write: false,
				bundle: true,
				minify,
				sourcemap: "external",
				sourcesContent: true,
				outdir: ".",
			})).outputFiles;
			const hexHash = NodeCrypto.hash("sha1", cssFile.hash, "hex").slice(0, 12);
			const hash = (BigInt("0x" + hexHash) % (36n ** 8n)).toString(36).padStart(8, "0");
			const cssFileName = `main-${hash}.css`;
			cssFilePath = "./" + Path.posix.join(appfilesFolderPath, cssFileName);
			await FS.writeFile(
				Path.resolve(absoluteAppfilesFolderPath, cssFileName),
				cssFile.text + `/*# sourceMappingURL=./${global.encodeURI(cssFileName)}.map */`,
				{ encoding: "utf-8" },
			);
			// const sourceMap = JSON.parse(sourceMapString.text);
			// await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, `./main-${hash}.css.map`), JSON.stringify(sourceMap, null, "\t"));
			// const sourceMap = JSON.parse(sourceMapString.text);
			await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, `./main-${hash}.css.map`), sourceMapFile.contents);
		}

		console.time("HTML");
		{
			const html = await FS.readFile(Path.resolve(process.cwd(), "./src/index.html"), { encoding: "utf-8" });
			const dom = new JSDOM(html);
			const doc = dom.window.document;
			doc.head.append("\n\t");
			{
				const stylesheetLink = doc.createElement("link");
				stylesheetLink.setAttribute("rel", "stylesheet");
				stylesheetLink.setAttribute("href", cssFilePath);
				doc.head.append(stylesheetLink);
			}
			doc.head.append("\n\n\t");
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

			await FS.writeFile(Path.resolve(process.cwd(), outputFolderPath, "./index.html"), `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, { encoding: "utf-8" });
		}
		console.timeEnd("HTML");
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
};
