

export const CSSReference = class {
	id: string;
	constructor(id: string) {
		this.id = id;
	}
}

export const jsxs = (elementType: any, { children = [], ...params }) => {
	// if (!Array.isArray(children)) {
	// 	children = [children];
	// }

	$: {
		let element: any;
		if (typeof elementType === "string") {
			element = document.createElement(elementType);
			for (const [key, value] of Object.entries(params)) {
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
		} else if (elementType === Fragment) {
			element = document.createElement("wz-frag");
		} else {
			break $;
		}

		for (const child of children.flat()) {
			if (typeof child === "string") {
				element.insertAdjacentHTML("beforeend", child)
			} else if (child instanceof CSSReference) {
				element.dataset.wzId = child.id;
			} else {
				element.append(child);
			}
		}
		return element;
	}

	if (elementType instanceof Element) {
		return elementType;
	} else {
		return elementType();
	}
};

export const jsx = (elementType: any, { children, ...params }) => jsxs(elementType, { children: children != null ? [children] : [], ...params });

export const Fragment = Symbol("Fragment");

// export * from "./index.ts";
