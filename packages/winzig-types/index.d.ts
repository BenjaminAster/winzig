
/// <reference lib="ESNext" />
/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />
/// <reference lib="DOM.AsyncIterable" />

/// <reference path="./generic-element.d.ts" />
/// <reference path="./htmlformelement.d.ts" />

declare namespace WinzigInternals {
	interface OpaqueCSSReference { }

	type ElementBase<T> = Partial<{
		[key in keyof GlobalEventHandlersEventMap as `on:${key}${"_preventDefault" | ""}`]: (this: T, event: GlobalEventHandlersEventMap[key]) => any;
	}>;

	type WinzigElement<T extends globalThis.Element = globalThis.Element> = Partial<
		Omit<T, keyof GlobalEventHandlers | keyof WindowEventHandlers | "onfullscreenchange" | "onfullscreenerror" | "children">
	> & WinzigInternals.ElementBase<T>;

	interface WinzigUsingDeclarationsPatch {
		[Symbol.dispose](): void;
	}
}

declare module "winzig" {
	export function css(templateArray: TemplateStringsArray, ...args: any[]): WinzigInternals.OpaqueCSSReference;
	// export declare class Variable<T> {
	// 	constructor(value: T);
	// 	_: T;
	// };

	export interface Config {
		appfiles?: string;
		output?: string;
		css?: string;
	}

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

		type asdf = keyof HTMLElementTagNameMap;

		type IntrinsicElements = {
			[key in Exclude<keyof HTMLElementTagNameMap, "form">]: WinzigInternals.WinzigElement<HTMLElementTagNameMap[key]>;
		} & {
			// This special case for <form> is necessary due to lib.dom.d.ts' HTMLFormElement interface having a
			// `[name: string]: any` property, which would mean that any attribute on <form> elements is valid.
			form: WinzigInternals.WinzigElement<WinzigInternals.FormElementWithoutIndexedAccess>;
		};

		interface ElementClass {
			render: any;
		}

		interface ElementAttributesProperty {
			__props: any;
		}

		interface IntrinsicAttributes extends WinzigInternals.ElementBase<HTMLElement> {
		}

	}

	global {
		interface Element {
			(): this;
		}

		interface Function {
			props: {
				asdf: string;
			};
		}
	}
}
