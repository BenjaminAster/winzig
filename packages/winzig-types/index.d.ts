
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
		[Symbol.dispose](): void;
	}

	declare global {
		interface Number extends WinzigUsingExpressionPatch { }
		interface String extends WinzigUsingExpressionPatch { }
		interface BigInt extends WinzigUsingExpressionPatch { }
		interface Object extends WinzigUsingExpressionPatch { }
		interface Boolean extends WinzigUsingExpressionPatch { }
		interface Symbol extends WinzigUsingExpressionPatch { }

		// interface Function {
		// 	await<A, T>(param: A): Awaited<T>;
		// }
	}
}

// import { JSX, WinzigInternals } from "./jsx-runtime.d.ts";

declare module "winzig/jsx-runtime" {
	declare namespace WinzigInternals {
		interface ElementBase {
			[key: `on:${string}`]: any;
		}

		type WinzigElement<T extends globalThis.Element = globalThis.Element> = Partial<Omit<T, "children">> & WinzigInternals.ElementBase;
	}

	export declare namespace JSX {
		type Element = (
			HTMLElement
			& HTMLAnchorElement
			& HTMLAreaElement
			& HTMLAudioElement
			& HTMLBaseElement
			& HTMLQuoteElement
			& HTMLBodyElement
			& HTMLButtonElement
			& HTMLCanvasElement
			& HTMLTableColElement
			& HTMLDataElement
			& HTMLDataListElement
			& HTMLModElement
			& HTMLDetailsElement
			& HTMLDialogElement
			& HTMLDivElement
			& HTMLDListElement
			& HTMLEmbedElement
			& HTMLFieldSetElement
			& HTMLFormElement
			& HTMLHeadingElement
			& HTMLHeadElement
			& HTMLHRElement
			& HTMLHtmlElement
			& HTMLIFrameElement
			& HTMLImageElement
			& HTMLInputElement
			& HTMLModElement
			& HTMLLabelElement
			& HTMLLegendElement
			& HTMLLIElement
			& HTMLLinkElement
			& HTMLMapElement
			& HTMLMenuElement
			& HTMLMetaElement
			& HTMLMeterElement
			& HTMLObjectElement
			& HTMLOListElement
			& HTMLOptGroupElement
			& HTMLOptionElement
			& HTMLOutputElement
			& HTMLParagraphElement
			& HTMLPictureElement
			& HTMLPreElement
			& HTMLProgressElement
			& HTMLQuoteElement
			& HTMLScriptElement
			// & HTMLSelectElement
			// & HTMLSlotElement
			// & HTMLSourceElement
			// & HTMLSpanElement
			// & HTMLStyleElement
			// & HTMLTableElement
			// & HTMLTableSectionElement
			// & HTMLTableCellElement
			// & HTMLTemplateElement
			// & HTMLTextAreaElement
			// & HTMLTableSectionElement
			// & HTMLTableCellElement
			// & HTMLTableSectionElement
			// & HTMLTimeElement
			// & HTMLTitleElement
			// & HTMLTableRowElement
			// & HTMLTrackElement
			// & HTMLUListElement
			// & HTMLVideoElement
		);

		export type IntrinsicElements = {
			[key in keyof HTMLElementTagNameMap]: WinzigInternals.WinzigElement<HTMLElementTagNameMap[key]>;
		};
	}


	declare global {
		interface Element {
			(): this;
		}
	}

	// export * from "react/jsx-runtime";
}
