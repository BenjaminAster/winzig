
/// <reference lib="ESNext" />
/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />
/// <reference lib="DOM.AsyncIterable" />

/// <reference path="./generated.d.ts" />
/// <reference path="./main.d.ts" />

// TODO: Maybe make async/await components work (might not be possible with TypeScript)
// interface CallableFunction extends Function {
// 	await<T, R = WinzigInternals.WinzigGenericElement>(this: (props: T) => R, props?: T): Awaited<R>;
// }

declare namespace WinzigInternals {
	type OpaqueCSSReference = import("./main.d.ts").OpaqueCSSReference;
	type Config = import("./main.d.ts").Config;
	type WinzigUsingDeclarationsPatch = import("./main.d.ts").WinzigUsingDeclarationsPatch;
	type GlobalEventHandlers = import("./main.d.ts").GlobalEventHandlers;
	type WinzigGenericElement = import("./generated.d.ts").WinzigGenericElement;
	type TagNameToAttributesMap = import("./generated.d.ts").TagNameToAttributesMap;
}

declare module "winzig" {
	export function css(templateArray: TemplateStringsArray, ...args: any[]): WinzigInternals.OpaqueCSSReference;
	type Config = WinzigInternals.Config;

	export interface GenericElement extends WinzigInternals.WinzigGenericElement { }

	global {
		interface Number extends WinzigInternals.WinzigUsingDeclarationsPatch { }
		interface String extends WinzigInternals.WinzigUsingDeclarationsPatch { }
		interface BigInt extends WinzigInternals.WinzigUsingDeclarationsPatch { }
		interface Object extends WinzigInternals.WinzigUsingDeclarationsPatch { }
		interface Boolean extends WinzigInternals.WinzigUsingDeclarationsPatch { }
		interface Symbol extends WinzigInternals.WinzigUsingDeclarationsPatch { }
	}
}

declare module "winzig/jsx-runtime" {
	export namespace JSX {
		export interface Element extends WinzigInternals.WinzigGenericElement { }

		interface IntrinsicElements extends WinzigInternals.TagNameToAttributesMap { }

		// interface ElementAttributesProperty {
		// 	__props: {};
		// }

		interface IntrinsicAttributes extends WinzigInternals.GlobalEventHandlers { }
	}
}
