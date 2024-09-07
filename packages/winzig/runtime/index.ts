
var createElement = document.createElement.bind(document);

var setTextNodeDataToEventDotDetail = function (this: Text, event: CustomEvent) {
	this.data = event.detail;
};

var setElementPropertyToEventDotDetail = function (this: any, key: string, event: CustomEvent) {
	this[key] = event.detail;
};

var jsx = (elementOrFunction: any, namedArgs: any, ...children: any[]): Element => {
	var element: any;
	var dataset: any;
	var _l: any;
	var _r: any;
	var params: any;
	var key: string;
	var callback: Function;
	var value: any;
	var textNode: Text;
	if (typeof elementOrFunction === "function") {
		element = elementOrFunction(namedArgs ?? {}, children);
		if (namedArgs?._l) for ([key, callback] of namedArgs._l) {
			element.addEventListener(key, callback as any);
		}
		element.dataset.wzNewScope = "";
		return element;
	} else {
		if (namedArgs) {
			({ dataset, _l, _r, ...params } = namedArgs);
			if (dataset) Object.assign(elementOrFunction.dataset, dataset);
			Object.assign(elementOrFunction, params);
			if (_l) for ([key, callback] of _l) {
				elementOrFunction.addEventListener(key, callback as any);
			}
			if (_r) for ([key, value] of _r) {
				elementOrFunction[key] = value.v;
				// value.addEventListener("", (event: CustomEvent) => elementOrFunction[key] = event.detail);
				value.addEventListener("", setElementPropertyToEventDotDetail.bind(elementOrFunction, key));
			}
		}

		for (element of children) {
			elementOrFunction.append(element instanceof LiveVariable
				? (element.addEventListener("", setTextNodeDataToEventDotDetail.bind(textNode = new Text(element.v))),
					textNode)
				: element
			);
		}
		return elementOrFunction;
	}
};

var LiveVariable = class <T> extends EventTarget {
	v: T;
	constructor(value?: T) {
		if (Array.isArray(value)) {
			// Super hacky, but it works!
			return new LiveArray(value) as any;
		}
		super();
		this.v = value;
	};
	// notify
	n() {
		this.dispatchEvent(new CustomEvent("", { detail: this.v }));
	};
	get _() {
		return this.v;
	};
	set _(value: T) {
		this.v = value;
		this.n();
	};
};

type LiveVariable<T> = typeof LiveVariable<T>["prototype"];
type MapCallback<T> = (value: T, index?: LiveVariable<number>) => ChildNode;
type StoredTriple<T> = [ChildNode[], MapCallback<T>, LiveVariable<number>[]?];

var LiveArray = class <T> extends LiveVariable<T[]> {
	#mappedArrays = new Set<StoredTriple<T>>();
	constructor(array: T[]) {
		super();
		this.v = array;
	};
	#finalizationRegistry = new FinalizationRegistry((triple: StoredTriple<T>) => {
		this.#mappedArrays.delete(triple);
	});
	#canonicalSplice(start: number, deleteCount: number, newItems?: T[]) {
		var index: number;
		var newLiveIndexVars: Array<LiveVariable<number>>;
		var mappedItems: ChildNode[];
		for (var [nodes, callback, liveIndexVars] of this.#mappedArrays) {
			for (index = 0; index < deleteCount; ++index) {
				nodes[start + index].remove();
			}
			newLiveIndexVars = (liveIndexVars && newItems) ? Array<LiveVariable<number>>(newItems.length) : undefined;
			if (newItems) {
				mappedItems = newItems.map(liveIndexVars
					? (item, index) => callback(item, newLiveIndexVars[index] = new LiveVariable(start + index))
					: callback as any);
				nodes[start + deleteCount].before(...mappedItems);
				nodes.splice(start, deleteCount, ...mappedItems);
			} else {
				nodes.splice(start, deleteCount);
			}
			if (liveIndexVars) {
				if (newLiveIndexVars) liveIndexVars.splice(start, deleteCount, ...newLiveIndexVars);
				else liveIndexVars.splice(start, deleteCount);
				for (index = start; index < liveIndexVars.length; ++index) {
					liveIndexVars[index]._ = index;
				}
			}
		}
		this.n();
	};

	// .map()
	m(callback: MapCallback<T>) {
		var indexParamUsed = callback.length !== 1;
		var liveVars = indexParamUsed ? Array<LiveVariable<number>>(this.v.length) : undefined;
		var array: ChildNode[] = this.v.map(
			indexParamUsed
				? (item, index) => callback(item, liveVars[index] = new LiveVariable(index))
				: callback as any
		);
		var arrayCallbackTriple: StoredTriple<T> = [array, callback, liveVars];
		var secondComment = new Comment();
		array.push(new Comment());

		this.#finalizationRegistry.register(secondComment, arrayCallbackTriple);
		this.#mappedArrays.add(arrayCallbackTriple);
		return [...array, secondComment];
	};

	set _(value: T[]) {
		this.v = value;
		this.#canonicalSplice(0, this.v.length, value);
	};

	// setter (replaces `array[index] = item` expressions)
	i(index: number, item: T) {
		this.v[index] = item;
		this.#canonicalSplice(index, 1, [item]);
		return item;
	};

	// .copyWithin()
	c(target: number, start: number, end: number) {
		this.v.copyWithin(target, start, end);
		this.#canonicalSplice(target, end - start, this.v.slice(start, end));
		return this.v;
	};
	// .fill()
	f(value: T, start: number = 0, end: number = this.v.length) {
		this.v.fill(value, start, end);
		this.#canonicalSplice(start, end - start, Array(end - start).fill(value));
		return this.v;
	};
	// .pop()
	o() {
		var originalLastItem = this.v.pop();
		this.#canonicalSplice(this.v.length, 1);
		return originalLastItem;
	};
	// .push()
	p(...items: T[]) {
		this.v.push(...items);
		this.#canonicalSplice(this.v.length - 1, 0, items);
		return this.v.length;
	};
	// .reverse()
	r() {
		return this._ = this.v.reverse();
	};
	// .shift()
	h() {
		var originalFirstItem = this.v.shift();
		this.#canonicalSplice(0, 1);
		return originalFirstItem;
	};
	// .sort()
	t(compareFn: any) {
		return this._ = this.v.sort(compareFn);
	};
	// .splice() {
	s(start: number, deleteCount: number, ...items: T[]) {
		var deletedItems = this.v.splice(start, deleteCount, ...items);
		this.#canonicalSplice(start, deleteCount, items);
		return deletedItems;
	};
	// .unshift() {
	u(...items: T[]) {
		this.v.unshift(...items);
		this.#canonicalSplice(0, 0, items);
		return this.v.length;
	};
};

var liveExpression = <T>(func: () => T, ...dependencies: LiveVariable<any>[]) => {
	var returnVariable = new LiveVariable<T>(func());
	addListeners(() => returnVariable._ = func(), ...dependencies);
	return returnVariable;
};

var addListeners = (func: () => any, ...dependencies: LiveVariable<any>[]) => {
	for (var dependency of dependencies) {
		dependency.addEventListener("", func);
	}
};

export { jsx as j, LiveVariable as V, addListeners as l, liveExpression as e, LiveArray as A, createElement as c };
