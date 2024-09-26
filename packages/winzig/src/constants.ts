
export const arrayModifyingMethodsSingleLetterMappings: Record<string, string> = Object.assign(Object.create(null), {
	copyWithin: "c",
	fill: "f",
	pop: "o",
	push: "p",
	reverse: "r",
	shift: "h",
	sort: "t",
	splice: "s",
	unshift: "u",
});

export const AssignmentOperatorMappings = {
	"+=": { type: "BinaryExpression", operator: "+" },
	"-=": { type: "BinaryExpression", operator: "-" },
	"*=": { type: "BinaryExpression", operator: "*" },
	"/=": { type: "BinaryExpression", operator: "/" },
	"%=": { type: "BinaryExpression", operator: "%" },
	"**=": { type: "BinaryExpression", operator: "**" },
	"<<=": { type: "BinaryExpression", operator: "<<" },
	">>=": { type: "BinaryExpression", operator: ">>" },
	">>>=": { type: "BinaryExpression", operator: ">>>" },
	"|=": { type: "BinaryExpression", operator: "|" },
	"^=": { type: "BinaryExpression", operator: "^" },
	"&=": { type: "BinaryExpression", operator: "&" },
	"||=": { type: "LogicalExpression", operator: "||" },
	"&&=": { type: "LogicalExpression", operator: "&&" },
	"??=": { type: "LogicalExpression", operator: "??" },
} as const;

export const svgElements = new Set([
	// https://svgwg.org/svg2-draft/eltindex.html
	// <a>, <script>, <style> and <title> are prefixed with `svg:`!
	"svg:a", "animate", "animateMotion", "animateTransform", "circle", "clipPath",
	"defs", "desc", "discard", "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer",
	"feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap",
	"feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG",
	"feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology",
	"feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile",
	"feTurbulence", "filter", "foreignObject", "g", "image", "line", "linearGradient",
	"marker", "mask", "metadata", "mpath", "path", "pattern", "polygon", "polyline",
	"radialGradient", "rect", "svg:script", "set", "stop", "svg:style", "svg", "switch",
	"symbol", "text", "textPath", "svg:title", "tspan", "use", "view",
]);

export const mathMLElements = new Set([
	// https://w3c.github.io/mathml-core/#mathml-elements-and-attributes
	"annotation", "annotation-xml", "maction", "math", "merror", "mfrac", "mi",
	"mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mprescripts",
	"mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msubsup", "msup",
	"mtable", "mtd", "mtext", "mtr", "munder", "munderover", "semantics",
]);

export const tagNameToDocumentPropertyMappings: Record<string, string> = {
	body: "body",
	head: "head",
	html: "documentElement",
};

// https://html.spec.whatwg.org/multipage/syntax.html#void-elements
// deprecated void elements (https://html.spec.whatwg.org/multipage/parsing.html#serializes-as-void) excluded
export const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
