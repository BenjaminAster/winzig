
// https://html.spec.whatwg.org/multipage/syntax.html#void-elements
// deprecated void elements (https://html.spec.whatwg.org/multipage/parsing.html#serializes-as-void) excluded
const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

export class Node {
	textContent: string;
	constructor() { };
};

export class Text extends Node {
	constructor(data: string) {
		super();
		this.textContent = data;
	};
};

export class Element extends Node {
	localName: string;
	childNodes: Node[] = [];
	attributes = new Map<string, string>();
	constructor(type: string) {
		super();
		this.localName = type;
	};
	append(...nodes: Node[]) {
		this.childNodes.push(...nodes);
	};
	prepend(...nodes: Node[]) {
		this.childNodes.unshift(...nodes);
	};
	insertBefore(newNode: Node, referenceNode: Node) {
		const index = this.childNodes.indexOf(referenceNode);
		this.childNodes.splice(index, 0, newNode);
	};
	getAttribute(name: string) {
		this.attributes.get(name);
	};
	hasAttribute(name: string) {
		this.attributes.has(name);
	};
	setAttribute(name: string, value: string) {
		this.attributes.set(name, value);
	};
	get outerHTML(): string {
		return (
			"<"
			+ this.localName
			+ [...this.attributes].map(([name, value]) => ` ${name}="${value.replaceAll('"', "&quot;")}"`).join("")
			+ ">"
			+ (voidElements.has(this.localName) ? "" :
				// TODO: maybe care about HTML sanitization?
				// Currently, it really doesn't matter since the only element that gets text content
				// is the importmap <script>, which is a raw text element anyway.
				this.childNodes.map((childNode) => childNode instanceof Element ? childNode.outerHTML : childNode.textContent).join("")
				+ `</${this.localName}>`
			)
		);
	};
};

export class Document extends Node {
	head = new Element("head");
	body = new Element("body");
	documentElement = new Element("html");
	constructor() {
		super();
		this.documentElement.append(this.head, this.body);
	};
	createElement(type: string) {
		return new Element(type);
	};
};
