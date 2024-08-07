
const jsx = (elementTypeOrFunction: any, namedArgs: any, ...children: any[]) => {
	$: {
		let element: any;
		let isFragment: boolean;
		if (typeof elementTypeOrFunction === "string" || (isFragment = elementTypeOrFunction === FragmentSymbol)) {
			element = document.createElement(isFragment ? "wz-frag" : elementTypeOrFunction);
			if (namedArgs) {
				const { dataset, ...params } = namedArgs;
				if (dataset) Object.assign(element.dataset, dataset);
				for (const [key, value] of Object.entries(params) as any) {
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
			}
		} else {
			break $;
		}

		for (const child of children) {
			if (typeof child === "string") {
				element.append(child);
			} else if (child instanceof Variable) {
				const textNode = new Text(child._);
				child.addEventListener("", (event) => textNode.data = event.detail);
				element.append(textNode);
			} else {
				element.append(Array.isArray(child) ? jsx(FragmentSymbol, null, ...child) : child);
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

const FragmentSymbol = Symbol();
interface VariableEventMap {
	"": CustomEvent;
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

const Variable = class <T> extends EventTarget {
	#value: T;
	constructor(value: T) {
		super();
		this.#value = value;
	};
	get _() {
		return this.#value;
	};
	set _(value: T) {
		this.#value = value;
		this.dispatchEvent(new CustomEvent("", { detail: value }));
	};
} as VariableConstructor;


export { FragmentSymbol as _Fragment, jsx as _jsx, Variable };
