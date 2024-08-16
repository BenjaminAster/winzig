
import * as FS from "node:fs/promises";
import * as Path from "node:path";
import * as HTTP from "node:http";
import * as NodeCrypto from "node:crypto";
import type * as Net from "node:net";
import type * as Stream from "node:stream";

import * as ESBuild from "esbuild";

import * as BabelParser from "@babel/parser";

import { Worker } from "node:worker_threads";

import type * as ESTree from "estree";
import * as Terser from "terser";
const terserMinify = Terser.minify as (
	files: Parameters<typeof Terser.minify>[0] | ESTree.Program[],
	options?: (Omit<Terser.MinifyOptions, "ecma" | "parse">
		& { parse?: (Terser.ParseOptions & { spidermonkey?: boolean; }), ecma?: number; }),
) => Promise<Terser.MinifyOutput>;

import type { EncodedSourceMap } from "@jridgewell/gen-mapping";

import { compileAST, reset as resetCompilationData } from "./compiler.ts";
import { initialCSS } from "./constants.ts";

let refreshPage: () => void;
let webSocketPort: number;

const DEBUG = false;

import type { WinzigOptions } from "../types/main.d.ts";

let FakeDOM: typeof import("./minimal-fake-dom.ts");
let addWinzigHTML: typeof import("../runtime/add-winzig-html.ts").default;

export const init = async ({
	appfilesFolderPath = "./appfiles/",
	outputFolderPath = "./",
	minify = true,
	watch = false,
	liveReload = false,
	keepPrerenderFolder = false,
	prerender = true,
	workingDirectory = process.cwd(),
}: WinzigOptions) => {

	const startTime = performance.now();

	if (!prerender) {
		FakeDOM ??= await import("./minimal-fake-dom.ts");
		addWinzigHTML ??= (await import("../runtime/add-winzig-html.ts")).default;
	}

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
		server.on("upgrade", (request, socket) => {
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
		minifyWhitespace: true,
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
		pure: [],
	};

	const esBuildChunksOptions: ESBuild.BuildOptions = {
		...esBuildCommonOptions,
		entryPoints: [
			{
				in: Path.resolve(process.cwd(), "./src/index.tsx"),
				out: "index",
			},
		],
		banner: {
			js: [
				`import {`,
				`\tj as __winzig__jsx,`,
				`\ts as __winzig__jsxSlot,`,
				`\tV as __winzig__LiveVariable,`,
				`\tl as __winzig__addListeners,`,
				`\te as __winzig__liveExpression,`,
				`\tf as __winzig__liveFragment,`,
				`} from "$appfiles/winzig-runtime.js";`,
			].join("\n"),
		},
		jsx: "transform",
		jsxFactory: "__winzig__jsx",
		jsxFragment: "__winzig__Fragment",
		jsxSideEffects: true,
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
		minifyWhitespace: minify,
		minifyIdentifiers: minify,
		minifySyntax: minify,
	};

	const esBuildWinzigPrerenderingRuntimeOptions: ESBuild.BuildOptions = {
		...esBuildCommonOptions,
		entryPoints: [
			{
				in: Path.resolve(winzigRuntimeDirectory, "./prerender-runtime.ts"),
				out: "winzig-prerender-runtime",
			},
		],
		external: undefined,
		alias: undefined,
		// alias: {
		// 	"$winzig-runtime-internal": "./winzig-runtime.js",
		// },
		packages: "external",
		// external: ["./winzig-runtime.js"],
		bundle: true,
		sourcemap: false,
	};

	const prerenderFolder = Path.resolve(absoluteAppfilesFolderPath, "./.winzig-prerender/");

	const [
		chunksBuildContext,
		winzigRuntimeBuild,
		winzigPrerenderingRuntimeBuild,
	] = await Promise.all([
		ESBuild.context(esBuildChunksOptions),
		ESBuild.build(esBuildWinzigRuntimeOptions),
		prerender ? ESBuild.build(esBuildWinzigPrerenderingRuntimeOptions) : null,
	] as const);

	const prerenderWorker = prerender ? new Worker(Path.resolve(import.meta.dirname, "./prerender-worker.js")) : null;

	const buildProject = async () => {
		if (DEBUG) console.time("Bundle JavaScript");
		await FS.mkdir(absoluteAppfilesFolderPath, { recursive: true });
		await Promise.all((await FS.readdir(absoluteAppfilesFolderPath, { withFileTypes: true })).map(async entry => {
			await FS.rm(Path.join(absoluteAppfilesFolderPath, entry.name), { force: true, recursive: true });
		}));
		if (prerender) {
			await FS.mkdir(prerenderFolder, { recursive: true });
			await FS.writeFile(
				Path.resolve(prerenderFolder, "./package.json"),
				JSON.stringify({ type: "module" }, null, "\t"),
			);
		}

		const outputFiles: ESBuild.OutputFile[] = [];

		resetCompilationData();
		const chunksBuild = await chunksBuildContext.rebuild();
		outputFiles.push(...chunksBuild.outputFiles, ...winzigRuntimeBuild.outputFiles, ...(winzigPrerenderingRuntimeBuild?.outputFiles ?? []));

		const importMap = new Map<string, string>();
		let entryFilePath: string;
		const modulePreloadPaths: string[] = [];

		let previousSourceMap: any;

		if (DEBUG) console.timeEnd("Bundle JavaScript");

		let cssSnippets: string[] = [
			initialCSS,
		];

		if (DEBUG) console.time("Compile and generate files");
		for (const file of outputFiles) {
			const originalRelativePath = Path.relative(absoluteAppfilesFolderPath, file.path).replaceAll("\\", "/");;

			const [name, hashPlusExtension] = originalRelativePath.split(nameHashSeparatorString);
			const hash = hashPlusExtension.slice(0, 8).toLowerCase();
			const extension = hashPlusExtension.slice(8);

			const relativePath = `${name}-${hash}${extension}`;

			const browserRelativePath = "./" + Path.posix.join(appfilesFolderPath, relativePath);

			// let contentStringOrByteArray: string | Uint8Array;

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
					await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath), JSON.stringify(sourceMap, null, "\t"));
				} else {
					previousSourceMap = JSON.parse(file.text);
				}
			} else {
				if (extension === ".js") {
					if (name === "index") {
						entryFilePath = browserRelativePath;
					} else if (name !== "winzig-prerender-runtime") {
						modulePreloadPaths.push(browserRelativePath);
					}

					let code = file.text;
					if (name !== "winzig-prerender-runtime") {
						if (name !== "winzig-runtime") {
							if (DEBUG) console.time("Parse code");
							const ast = BabelParser.parse(code, {
								plugins: ["estree", "explicitResourceManagement"],
								sourceType: "module",
								attachComment: false,
							}).program as unknown as ESTree.Program;
							if (DEBUG) console.timeEnd("Parse code");

							if (DEBUG) console.time("Modify AST");
							const { cssSnippets: newCSSSnippets } = compileAST(ast);
							cssSnippets.push(...newCSSSnippets);
							if (DEBUG) console.timeEnd("Modify AST");

							if (DEBUG) console.time("Print code");
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
								format: {
									wrap_func_args: false,
								},
							});
							code = terserResult.code;
							const map = terserResult.map as EncodedSourceMap;
							await FS.writeFile(
								Path.resolve(absoluteAppfilesFolderPath, relativePath) + ".map",
								JSON.stringify(map, null, "\t"),
							);
							if (DEBUG) console.timeEnd("Print code");
						}
						const sourceMapComment = `//# sourceMappingURL=./${global.encodeURI(relativePath)}.map`;
						code = (code + (name === "winzig-runtime" ? "" : "\n") + sourceMapComment);
						if (name !== "index") importMap.set(`$appfiles/${name}.js`, browserRelativePath);
					}

					if (prerender) {
						const prerenderingCode = (name === "winzig-runtime") ? code : code.replace(`}from"$appfiles/`, `}from"./`);
						const newName = name === "winzig-prerender-runtime"
							? "winzig-runtime"
							: name === "winzig-runtime"
								? "winzig-original-runtime"
								: name;
						await FS.writeFile(Path.resolve(prerenderFolder, `./${newName}.js`), prerenderingCode);
					}
					if (name !== "winzig-prerender-runtime") {
						if (name === "index" && prerender) {
							code = code.split('"__$WZ_SEPARATOR__",').toSpliced(1, 1).join("");
						}
						await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath), code);
					}
				} else {
					await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath), file.contents);
				}
			}
		}
		if (DEBUG) console.timeEnd("Compile and generate files");

		if (DEBUG) console.time("Build CSS");
		let cssFilePath: string;
		{
			const [sourceMapFile, cssFile] = (await ESBuild.build({
				stdin: {
					contents: cssSnippets.join("\n"),
					loader: "css",
					sourcefile: "main.css",
				},
				write: false,
				bundle: true,
				minifyWhitespace: minify,
				sourcemap: "external",
				sourcesContent: true,
				entryNames: "main-[hash]",
				outdir: absoluteAppfilesFolderPath,
			})).outputFiles;
			const cssFileName = cssFile.path.replaceAll("\\", "/").split("/").at(-1).toLowerCase();
			cssFilePath = "./" + Path.posix.join(appfilesFolderPath, cssFileName);
			await FS.writeFile(
				Path.resolve(absoluteAppfilesFolderPath, cssFileName),
				cssFile.text + `/*# sourceMappingURL=./${global.encodeURI(cssFileName)}.map */`,
			);
			const sourceMap = JSON.parse(sourceMapFile.text);
			sourceMap.sourceRoot = "//winzig-virtual-fs/css/";
			await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, `./${cssFileName}.map`), JSON.stringify(sourceMap, null, "\t"));
		}
		if (DEBUG) console.timeEnd("Build CSS");

		{
			const buildData = {
				cssFilePath,
				modulePreloadPaths,
				entryFilePath,
				importMap,
				prerenderFolder,
			};

			if (prerender) {
				if (DEBUG) console.time("Prerender");
				const html: string = await new Promise((resolve) => {
					const listener = (data: any) => {
						if (data.type === "send-html") {
							prerenderWorker.removeListener("message", listener);
							resolve(data.html);
						}
					};
					prerenderWorker.on("message", listener);
					prerenderWorker.postMessage({
						type: "run",
						...buildData,
					});
				});
				await FS.writeFile(Path.resolve(process.cwd(), outputFolderPath, "./index.html"), html);
				if (DEBUG) console.timeEnd("Prerender");
			} else {
				const document = new FakeDOM.Document();
				addWinzigHTML({ document, Text: FakeDOM.Text }, buildData);
				const html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
				await FS.writeFile(Path.resolve(process.cwd(), outputFolderPath, "./index.html"), html);
			}
		}

		if (prerender && !keepPrerenderFolder) {
			await FS.rm(prerenderFolder, { recursive: true });
		}
	};

	await buildProject();
	console.info(`Built in ${(performance.now() - startTime).toFixed(1)} ms.`);

	if (watch) {
		const watchingForFileChangesText = `Watching for file changes in ${Path.resolve(process.cwd(), "./src/").replaceAll("\\", "/")}...`;
		console.info(watchingForFileChangesText);
		(async () => {
			let lastChangeTime = 0;
			for await (const { filename, eventType } of FS.watch(Path.resolve(process.cwd(), "./src/"), { recursive: true })) {
				if (performance.now() - lastChangeTime < 500) continue;
				lastChangeTime = performance.now();
				console.clear();
				console.info(`File ${eventType} detected (src/${filename.replaceAll("\\", "/")}), rebuilding...`);
				await buildProject();
				console.info(`Rebuilt in ${(performance.now() - lastChangeTime).toFixed(1)} ms.`);
				console.info(watchingForFileChangesText);
				if (liveReload) refreshPage?.();
			}
		})();
	} else {
		chunksBuildContext.dispose();
		prerenderWorker?.unref();
	}
};
