
namespace WinzigInternals {
	interface CSSReference { }
	var CSSReference: {
		prototype: CSSReference;
	};
}


declare module "winzig" {
	export function css(templateArray: TemplateStringsArray, ...args: any[]): WinzigInternals.CSSReference;
	export declare class Variable<T> {
		constructor(value: T);
		_: T;
	};

	export interface Config {
		appfiles?: string;
		pretty?: boolean;
		output?: string;
	}

	interface WinzigUsingExpressionPatch {
		[Symbol.dispose](): any;
	}

	declare global {
		interface Number extends WinzigUsingExpressionPatch { }
		interface String extends WinzigUsingExpressionPatch { }
		interface BigInt extends WinzigUsingExpressionPatch { }
		interface Object extends WinzigUsingExpressionPatch { }
		interface Boolean extends WinzigUsingExpressionPatch { }
	}
}

// import { JSX, WinzigInternals } from "./jsx-runtime.d.ts";

declare module "winzig/jsx-runtime" {
	declare namespace WinzigInternals {
		// type WinzigElement<T> = {
		// 	[key in keyof (Omit<T, "children">)]?: T[key];
		// 	// [key in keyof T]?: T[key];
		// 	// children?: any;
		// }

		// type WinzigElement<T> extends asdf<T> {
		// 	// [key: `on:${string}`]: any;
		// }

		// interface WinzigElement<T> extends T {
		// 	// [key: `on:${string}`]: any;
		// }

		interface ElementBase {
			[key: `on:${string}`]: any;
		}

		// type KnownKeys<T> = {
		// 	[K in keyof T]: string extends K ? never : number extends K ? never : K
		// } extends { [_ in keyof T]: infer U } ? U : never;
		type KnownKeys<T> = Required<{
			[K in keyof T]: string extends K ? undefined : number extends K ? undefined : T[K]
		}>;

		type WinzigElement<T extends globalThis.Element = globalThis.Element> = Partial<Omit<T, "children">> & WinzigInternals.ElementBase;
	}

	export declare namespace JSX {
		// type Element = HTMLElement & { value?: string };
		type Element = (
			HTMLElement
			& HTMLInputElement
			& HTMLButtonElement
			& HTMLFormElement
			& {
				children: any;
			}
		);

		// interface ElementClass {}

		// interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
		// type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
		// type LibraryManagedAttributes<C, P> = unknown;
		// interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
		// interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
		// interface IntrinsicElements extends React.JSX.IntrinsicElements {}

		export interface IntrinsicElements {
			div: WinzigInternals.WinzigElement<HTMLDivElement>;
			ul: WinzigInternals.WinzigElement<HTMLUListElement>;
			li: WinzigInternals.WinzigElement<HTMLLIElement>;
			button: WinzigInternals.WinzigElement<HTMLButtonElement>;
			input: WinzigInternals.WinzigElement<HTMLInputElement>;
			main: WinzigInternals.WinzigElement<HTMLElement>;
			h1: WinzigInternals.WinzigElement<HTMLHeadingElement>;
			br: WinzigInternals.WinzigElement<HTMLBRElement>;
			code: WinzigInternals.WinzigElement<HTMLElement>;
			form: any;
			body: WinzigInternals.WinzigElement<HTMLBodyElement>;
			html: WinzigInternals.WinzigElement<HTMLHtmlElement>;
			head: WinzigInternals.WinzigElement<HTMLHeadElement>;
			title: WinzigInternals.WinzigElement<HTMLTitleElement>;
			meta: WinzigInternals.WinzigElement<HTMLMetaElement>;
			slot: WinzigInternals.WinzigElement<HTMLSlotElement>;
			// form: WinzigInternals.WinzigElement<Pick<HTMLFormElement, KnownKeys<HTMLFormElement>>>;
			// form: WinzigInternals.WinzigElement<WinzigInternals.KnownKeys<HTMLFormElement>>;
			// form: WinzigInternals.WinzigElement<WinzigInternals.KnownKeys<Partial<Omit<HTMLFormElement, "children">>>>;
		}
	}


	declare global {
		interface Element {
			(): this;
		}
	}

	// export * from "react/jsx-runtime";
}
