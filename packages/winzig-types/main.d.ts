
export declare interface OpaqueCSSReference { }

type EventHandlerModifier = "" | "_preventDefault";

interface ElementEventMap {
	"fullscreenchange": Event;
	"fullscreenerror": Event;
}

interface HTMLMediaElementEventMap {
	"encrypted": MediaEncryptedEvent;
	"waitingforkey": Event;
}

interface HTMLVideoElementEventMap {
	"enterpictureinpicture": Event;
	"leavepictureinpicture": Event;
}

export type GlobalEventHandlers = Partial<{
	[key in keyof GlobalEventHandlersEventMap as `on:${key}${EventHandlerModifier}`]:
	(this: HTMLElement, event: GlobalEventHandlersEventMap[key]) => any;
}>;

export type ElementEventHandlers = Partial<{
	[key in keyof ElementEventMap as `on:${key}${EventHandlerModifier}`]:
	(this: Element, event: ElementEventMap[key]) => any;
}>;

export type HTMLMediaElementEventHandlers = Partial<{
	[key in keyof HTMLMediaElementEventMap as `on:${key}${EventHandlerModifier}`]:
	(this: HTMLMediaElement, event: HTMLMediaElementEventMap[key]) => any;
}>;

export type HTMLVideoElementEventHandlers = Partial<{
	[key in keyof HTMLVideoElementEventMap as `on:${key}${EventHandlerModifier}`]:
	(this: HTMLVideoElement, event: HTMLVideoElementEventMap[key]) => any;
}>;

export interface WinzigUsingDeclarationsPatch {
	[Symbol.dispose](): void;
}

export interface Config {
	appfiles?: string;
	output?: string;
	css?: string;
	noCSSScopeRules?: boolean;
	noJavaScript?: boolean;
	entries?: Record<string, {
		src: string,
		preload?: boolean,
	}>;
}
