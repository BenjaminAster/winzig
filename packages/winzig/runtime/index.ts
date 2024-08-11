
const globalSlottableChildrenStack: any[] = [];

const FragmentSymbol = Symbol();
const SlotSymbol = Symbol();

const jsx = (elementTypeOrFunction: any, namedArgs: any, ...children: any[]): Element => {
	if (typeof elementTypeOrFunction === "function") {
		let currentGlobalSlottableChildrenStackLength = globalSlottableChildrenStack.length;
		globalSlottableChildrenStack.push(children);
		const element: HTMLElement = elementTypeOrFunction();
		if (currentGlobalSlottableChildrenStackLength !== globalSlottableChildrenStack.length) {
			globalSlottableChildrenStack.pop();
		}
		element.dataset.wzNewScope = "";
		return element;
	} else {
		let element: any = typeof elementTypeOrFunction === "object"
			? elementTypeOrFunction
			: document.createElement(typeof elementTypeOrFunction === "symbol" ? "wz-frag" : elementTypeOrFunction);
		if (elementTypeOrFunction === SlotSymbol) {
			element.append(...globalSlottableChildrenStack.pop());
		} else {
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

			for (const child of children) {
				if (typeof child === "string") {
					element.append(child);
				} else if (child instanceof LiveVariable) {
					const textNode = new Text(child._);
					child.addEventListener("", (event) => textNode.data = event.detail);
					element.append(textNode);
				} else {
					element.append(Array.isArray(child) ? jsx(FragmentSymbol, null, ...child) : child);
				}
			}
		}
		return element;
	}
};

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

const LiveVariable = class <T> extends EventTarget {
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

const liveExpression = <T>(func: () => T, ...dependencies: Variable<any>[]) => {
	const returnVariable = new LiveVariable<T>(func());
	addListeners(() => returnVariable._ = func(), ...dependencies);
	return returnVariable;
};

const addListeners = (func: () => any, ...dependencies: Variable<any>[]) => {
	for (const dependency of dependencies) {
		dependency.addEventListener("", func);
	}
};


export { FragmentSymbol as _F, jsx as _j, LiveVariable as _V, SlotSymbol as _S, addListeners as _l, liveExpression as _e };
