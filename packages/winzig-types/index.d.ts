
/// <reference lib="ESNext" />
/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />
/// <reference lib="DOM.AsyncIterable" />

/// <reference path="./generated.d.ts" />

declare namespace WinzigInternals {
	interface OpaqueCSSReference { }

	type EventHandlerModifier = "" | "_preventDefault";

	interface HTMLMediaElementEventMap {
		"encrypted": MediaEncryptedEvent;
		"waitingforkey": Event;
	}

	interface HTMLVideoElementEventMap {
		"enterpictureinpicture": Event;
		"leavepictureinpicture": Event;
	}

	type GlobalEventHandlers = Partial<{
		[key in keyof GlobalEventHandlersEventMap as `on:${key}${WinzigInternals.EventHandlerModifier}`]:
		(this: HTMLElement, event: GlobalEventHandlersEventMap[key]) => any;
	}>;

	type HTMLMediaElementEventHandlers = Partial<{
		[key in keyof WinzigInternals.HTMLMediaElementEventMap as `on:${key}${WinzigInternals.EventHandlerModifier}`]:
		(this: HTMLElement, event: WinzigInternals.HTMLMediaElementEventMap[key]) => any;
	}>;

	type HTMLVideoElementEventHandlers = Partial<{
		[key in keyof WinzigInternals.HTMLVideoElementEventMap as `on:${key}${WinzigInternals.EventHandlerModifier}`]:
		(this: HTMLElement, event: WinzigInternals.HTMLVideoElementEventMap[key]) => any;
	}>;

	namespace ElementAttributes {
		interface HTMLElementAttributes extends Partial<ARIAMixin>, WinzigInternals.GlobalEventHandlers {
			accessKey?: string;
			autocapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
			autocorrect?: boolean;
			autofocus?: boolean;
			className?: string;
			contentEditable?: "true" | "false" | "plaintext-only" | "inherit";
			dir?: "ltr" | "rtl" | "auto";
			draggable?: boolean;
			enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
			hidden?: boolean;
			id?: string;
			inert?: boolean;
			inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
			lang?: string;
			nonce?: string;
			outerText?: string;
			popover?: "auto" | "manual";
			spellcheck?: boolean;
			style?: string;
			tabIndex?: number;
			title?: string;
			translate?: boolean;
			writingSuggestions?: "true" | "false";
		}
	}

	interface WinzigUsingDeclarationsPatch {
		[Symbol.dispose](): void;
	}
}

// TODO: Maybe make async/await components work (might not be possible with TypeScript)
// interface CallableFunction extends Function {
// 	await<T, R = WinzigInternals.WinzigGenericElement>(this: (props: T) => R, props?: T): Awaited<R>;
// }

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
		noCSSScopeRules?: boolean;
		entries?: Record<string, {
			src: string,
			preload?: boolean,
		}>;
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

		interface IntrinsicElements extends WinzigInternals.TagNameMap { }

		// interface ElementClass { }

		interface ElementAttributesProperty {
			__props: {};
		}

		interface IntrinsicAttributes extends WinzigInternals.GlobalEventHandlers { }
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
