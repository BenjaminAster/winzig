
export class Node {
	textContent: string;
	constructor() {
	};
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
	setAttribute(name: string, value: string) {
		this.attributes.set(name, value);
	};
	get outerHTML(): string {
		return (
			"<"
			+ this.localName
			+ [...this.attributes].map(([name, value]) => ` ${name}="${value.replaceAll('"', "&quot;")}"`).join("")
			+ ">"
			+ this.childNodes.map((childNode) => childNode instanceof Element ? childNode.outerHTML : childNode.textContent).join("")
			+ `</${this.localName}>`
		);
	};
};

export class Document extends Node {
	body: Element;
	head: Element;
	documentElement: Element;
	constructor() {
		super();
		this.head = new Element("head");
		this.body = new Element("body");
		this.documentElement = new Element("html");
		this.documentElement.append(this.head, this.body);
	};
	createElement(type: string) {
		return new Element(type);
	};
};
