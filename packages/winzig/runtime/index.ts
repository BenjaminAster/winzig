
// import { CSSReference } from "./runtime.ts";

let currentUniqueId = 0;
const createUniqueId = () => ++currentUniqueId;

const cssMap = new WeakMap<TemplateStringsArray, number>();

const CSSReference = class {
	id: number;
	constructor(id: number) {
		this.id = id;
	}
}

const jsx = (elementTypeOrFunction: any, params: any, ...children: any[]) => {
	// if (!Array.isArray(children)) {
	// 	children = [children];
	// }

	$: {
		let element: any;
		if (typeof elementTypeOrFunction === "string") {
			element = document.createElement(elementTypeOrFunction);
			if (params) for (const [key, value] of Object.entries(params) as any) {
				if (key.startsWith("on:")) {
					const [eventName, ...modifiers] = key.slice(3).split("_");
					element.addEventListener(
						eventName,
						modifiers.includes("preventDefault")
							? (event) => {
								event.preventDefault();
								value.call(element, event);
							}
							: value,
					);
				} else {
					element[key] = value;
				}
			}
		} else if (elementTypeOrFunction === Fragment) {
			element = document.createElement("wz-frag");
		} else {
			break $;
		}

		for (const child of children.flat()) {
			if (typeof child === "string") {
				element.append(child);
			} else if (child instanceof CSSReference) {
				element.dataset.wzId = child.id.toString(36);
			} else if (child instanceof Variable) {
				const textNode = new Text(child._);
				element.append(textNode);
				child.addEventListener("change", ({ detail }) => textNode.data = detail);
			} else {
				element.append(child);
			}
		}
		return element;
	}

	if (elementTypeOrFunction instanceof Element) {
		return elementTypeOrFunction;
	} else {
		const element: HTMLElement = elementTypeOrFunction();
		element.dataset.wzNewScope = "";
		return element;
	}
};

const Fragment = Symbol("Fragment");

// export { Fragment as __winzig__Fragment, createElement as __winzig__createElement };
export { Fragment, jsx };

// export * from "./index.ts";


// export const asdf = () => console.log("hello from winzig/src/index.ts");


export const css = (templateArray: TemplateStringsArray, ...args: any[]) => {
	let id = cssMap.get(templateArray);
	if (!id) {
		let string = "";
		for (let i = 0; i < args.length; i++) {
			string += templateArray[i] + args[i];
		}
		string += templateArray[templateArray.length - 1];
		id = createUniqueId();
		cssMap.set(templateArray, id);
		{
			const style = document.createElement("style");
			style.textContent = `@scope ([data-wz-id="${id}"]) to ([data-wz-new-scope]) { ${string} }`;
			style.dataset.wzStyleId = id.toString(36);
			document.head.append(style);
		}
	}
	return new CSSReference(id);
};

interface VariableEventMap {
	"change": CustomEvent;
};

interface Variable<T> extends EventTarget {
	_: T;
	addEventListener<K extends keyof VariableEventMap>(type: K, listener: (this: Variable<T>, ev: VariableEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
	addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
	removeEventListener<K extends keyof VariableEventMap>(type: K, listener: (this: Variable<T>, ev: VariableEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
	removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
};

interface VariableConstructor {
	new <T>(value: T): Variable<T>;
	prototype: Variable<any>;
};

export const Variable = class <T> extends EventTarget {
	#value: any;
	constructor(value: T) {
		super();
		this.#value = value;
	};
	get _() {
		return this.#value;
	};
	set _(value: T) {
		this.#value = value;
		this.dispatchEvent(new CustomEvent("change", { detail: value }));
	};
} as VariableConstructor;

