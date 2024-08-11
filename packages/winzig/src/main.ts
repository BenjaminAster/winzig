
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
		& { parse?: (Terser.ParseOptions & { spidermonkey?: boolean }), ecma?: number }),
) => Promise<Terser.MinifyOutput>;

import type { EncodedSourceMap } from "@jridgewell/gen-mapping";

import { compileAST, reset as resetCompilationData } from "./compiler.ts";
import { initialCSS } from "./constants.ts";

let refreshPage: () => void;
let webSocketPort: number;

import type { WinzigOptions } from "../types/main.d.ts";

export const init = async ({
	appfilesFolderPath = "./appfiles/",
	outputFolderPath = "./",
	minify = true,
	watch = false,
	liveReload = false,
	keepPrerenderFolder = false,
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
			js: `import { _j as __winzig__jsx, _F as __winzig__Fragment, _S as __winzig__Slot, _V as __winzig__LiveVariable, _l as __winzig__addListeners, _e as __winzig__liveExpression } from "$appfiles/winzig-runtime.js";`,
		},
		jsx: "transform",
		jsxFactory: "__winzig__jsx",
		jsxFragment: "__winzig__Fragment",
		jsxSideEffects: true,
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
		// packages: "external",
		// external: ["./winzig-runtime.js"],
		bundle: false,
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
		ESBuild.build(esBuildWinzigPrerenderingRuntimeOptions),
	] as const);

	const prerenderWorker = new Worker(Path.resolve(import.meta.dirname, "./prerender-worker.js"));

	const buildProject = async () => {
		console.time("Bundle JavaScript");
		await FS.mkdir(absoluteAppfilesFolderPath, { recursive: true });
		await Promise.all((await FS.readdir(absoluteAppfilesFolderPath, { withFileTypes: true })).map(async entry => {
			await FS.rm(Path.join(absoluteAppfilesFolderPath, entry.name), { force: true, recursive: true });
		}));
		await FS.mkdir(prerenderFolder, { recursive: true });
		await FS.writeFile(
			Path.resolve(prerenderFolder, "./package.json"),
			JSON.stringify({ type: "module" }, null, "\t"),
		);

		const outputFiles: ESBuild.OutputFile[] = [];

		resetCompilationData();
		const chunksBuild = await chunksBuildContext.rebuild();
		outputFiles.push(...chunksBuild.outputFiles, ...winzigRuntimeBuild.outputFiles, ...winzigPrerenderingRuntimeBuild.outputFiles);

		const importMap = new Map<string, string>();
		let entryFilePath: string;
		const modulePreloadPaths: string[] = [];

		let previousSourceMap: any;

		console.timeEnd("Bundle JavaScript");

		let cssSnippets: string[] = [
			initialCSS,
		];

		console.time("Compile and generate files");
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
							console.timeEnd("Print code");
						}
						const sourceMapComment = `//# sourceMappingURL=./${global.encodeURI(relativePath)}.map`;
						code = (code + (name === "winzig-runtime" ? "" : "\n") + sourceMapComment);
						if (name !== "index") importMap.set(`$appfiles/${name}.js`, browserRelativePath);
					}

					{
						const prerenderingCode = (name === "winzig-runtime") ? code : code.replace(`}from"$appfiles/`, `}from"./`);
						const newName = name === "winzig-prerender-runtime"
							? "winzig-runtime"
							: name === "winzig-runtime"
								? "winzig-original-runtime"
								: name;
						await FS.writeFile(Path.resolve(prerenderFolder, `./${newName}.js`), prerenderingCode);
					}
					if (name !== "winzig-prerender-runtime") {
						if (name === "index") {
							code = code.split("__$WZ_SEPARATOR__,").toSpliced(1, 1).join("");
						}
						await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath), code);
					}
				} else {
					await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, relativePath), file.contents);
				}
			}
		}
		console.timeEnd("Compile and generate files");

		console.time("Build CSS");
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
			await FS.writeFile(Path.resolve(absoluteAppfilesFolderPath, `./${cssFileName}.map`), sourceMapFile.contents);
		}
		console.timeEnd("Build CSS");

		{
			console.time("Prerender");
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
					cssFilePath,
					modulePreloadPaths,
					entryFilePath,
					importMap,
					prerenderFolder,
				});
			});
			await FS.writeFile(Path.resolve(process.cwd(), outputFolderPath, "./index.html"), html);
			console.timeEnd("Prerender");
		}

		if (!keepPrerenderFolder) {
			await FS.rm(prerenderFolder, { recursive: true });
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
		prerenderWorker.unref();
	}
};
