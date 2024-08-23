
const globalSlottableChildrenStack: any[] = [];

const jsxSlot = () => {
	const element = document.createElement("wz-frag");
	element.append(...globalSlottableChildrenStack.pop());
	return element;
};

const jsx = (elementTypeOrFunction: any, namedArgs: any, ...children: any[]): Element => {
	if (typeof elementTypeOrFunction === "function") {
		let currentGlobalSlottableChildrenStackLength = globalSlottableChildrenStack.length;
		globalSlottableChildrenStack.push(children);
		const element: HTMLElement = elementTypeOrFunction(namedArgs ?? {});
		if (currentGlobalSlottableChildrenStackLength !== globalSlottableChildrenStack.length) {
			globalSlottableChildrenStack.pop();
		}
		if (namedArgs?._l) for (const [event, callback] of namedArgs._l) {
			element.addEventListener(event, callback);
		}
		element.dataset.wzNewScope = "";
		return element;
	} else {
		let element: any = typeof elementTypeOrFunction === "object"
			? elementTypeOrFunction
			: document.createElement(elementTypeOrFunction);

		if (namedArgs) {
			const { dataset, _l, _r, ...params } = namedArgs;
			if (dataset) Object.assign(element.dataset, dataset);
			Object.assign(element, params);
			if (_l) for (const [event, callback] of _l) {
				element.addEventListener(event, callback);
			}
			if (_r) for (const [attribute, value] of _r) {
				element[attribute] = value._;
				value.addEventListener("", (event: CustomEvent) => element[attribute] = event.detail);
			}
		}

		// if (elementTypeOrFunction === "template") {
		// 	for (const child of children) {
		// 		element.content.append(child);
		// 	}
		// } else
		for (const child of children) {
			if (child instanceof LiveVariable) {
				const textNode = new Text(child._);
				child.addEventListener("", (event) => textNode.data = event.detail);
				element.append(textNode);
			} else {
				element.append(child);
			}
		}
		return element;
	}
};

interface VariableEventMap {
	"": CustomEvent;
};

interface LiveVariable<T> extends EventTarget {
	_: T;
	addEventListener<K extends keyof VariableEventMap>(type: K, listener: (this: LiveVariable<T>, ev: VariableEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
	addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
	removeEventListener<K extends keyof VariableEventMap>(type: K, listener: (this: LiveVariable<T>, ev: VariableEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
	removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
};

interface LiveVariableConstructor {
	new <T>(value: T): LiveVariable<T>;
	prototype: LiveVariable<any>;
};


const LiveVariable = class <T> extends EventTarget {
	#value: T;
	constructor(value: T) {
		super();
		// if (Array.isArray(value)) {
		// 	return new LiveArray(value) as any;
		// }
		this.#value = value;
	};
	get _() {
		return this.#value;
	};
	set _(value: T) {
		this.#value = value;
		this.dispatchEvent(new CustomEvent("", { detail: value }));
	};
} as LiveVariableConstructor;

// TODO: Implement live arrays

// const LiveArray = class <T> extends LiveVariable<T[]> {
// 	constructor(value: T[]) {
// 		super(undefined);
// 		this._ = value;
// 	};

// 	// copyWithin(target: number, start: number, end: number) {
// 	// 	this._.copyWithin(target, start, end);
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// 	// push(...items: T[]) {
// 	// 	this._.push(...items);
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// 	// pop() {
// 	// 	this._.pop();
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// 	// shift() {
// 	// 	this._.shift();
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// 	// unshift(...items: T[]) {
// 	// 	this._.unshift(...items);
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// 	// splice(start: number, deleteCount: number) {
// 	// 	this._.splice(start, deleteCount);
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// 	// reverse() {
// 	// 	this._.reverse();
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// 	// sort(compareFunction: any) {
// 	// 	this._.sort(compareFunction);
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// 	// fill(item: T, start: number, end: number) {
// 	// 	this._.fill(item, start, end);
// 	// 	this.dispatchEvent(new CustomEvent("", { detail: this._ }));
// 	// };
// };

const liveExpression = <T>(func: () => T, ...dependencies: LiveVariable<any>[]) => {
	const returnVariable = new LiveVariable<T>(func());
	addListeners(() => returnVariable._ = func(), ...dependencies);
	return returnVariable;
};

const addListeners = (func: () => any, ...dependencies: LiveVariable<any>[]) => {
	for (const dependency of dependencies) {
		dependency.addEventListener("", func);
	}
};

const liveFragment = (liveExpression: LiveVariable<any>) => {
	const fragment = document.createElement("wz-frag");
	const update = () => {
		fragment.textContent = "";
		fragment.append(...liveExpression._);
	};
	update();
	liveExpression.addEventListener("", update);
	return fragment;
};

export { jsx as j, LiveVariable as V, addListeners as l, liveExpression as e, jsxSlot as s, liveFragment as f };
