
import type * as ESTree from "estree";

// import * as FS from "node:fs/promises"

let tempExpression: ESTree.Expression;

let cssSnippets: string[];

let currentUniqueId: number;
const createUniqueId = () => ++currentUniqueId;

const visitExpression = (node: ESTree.Expression | ESTree.Pattern | ESTree.SpreadElement, inJSXArgument: boolean = false) => {
	if (!node) return;
	switch (node.type) {
		case "ArrowFunctionExpression": {
			if (node.expression) {
				visitExpression(node.body as ESTree.Expression);
			} else {
				visitStatementOrProgram(node.body as ESTree.BlockStatement);
			}
			break;
		}
		case "Identifier": {
			if (!inJSXArgument && node.name.endsWith("$")) {
				return {
					type: "MemberExpression",
					computed: false,
					loc: node.loc,
					object: node,
					optional: false,
					property: {
						type: "Identifier",
						name: "_",
						loc: node.loc,
					} satisfies ESTree.Identifier,
				} satisfies ESTree.MemberExpression;
			}
			break;
		}
		case "CallExpression": {
			if (node.callee.type === "Identifier" && node.callee.name === "__winzig__jsx") {
				const isHTMLElement = node.arguments[0].type === "Literal";
				const isFragment = node.arguments[0].type === "Identifier" && node.arguments[0].name === "__winzig__Fragment";
				let arg: ESTree.Expression | ESTree.SpreadElement;
				let cssId: number;
				for (let i = 2; i < node.arguments.length; ++i) {
					arg = node.arguments[i] as ESTree.Expression;

					if (
						i === node.arguments.length - 1
						&& (isHTMLElement || isFragment)
						&& arg.type === "TaggedTemplateExpression"
						&& arg.tag.type === "Identifier"
						&& arg.tag.name === "css"
					) {
						if (arg.quasi.expressions.length > 0) throw new Error("CSS dynamic Template string insertions not yet supported.");
						cssId = createUniqueId();

						let cssString = arg.quasi.quasis[0].value.cooked.trim();
						const [firstLine, ...otherLines] = cssString.split("\n");
						const leadingWhitespace = otherLines.at(-1).match(/^(\s*)/)[0].length;
						cssString = [firstLine, ...otherLines.map(line => line.slice(leadingWhitespace - 1))].join("\n");
						cssSnippets.push(`@scope ([data-wz-id="${cssId.toString(36)}"]) to ([data-wz-new-scope]) {\n\t${cssString}\n}\n`);
						node.arguments.pop();
					}
					visitExpression(arg, true);
				}
				if (cssId) {
					if (node.arguments[1].type !== "ObjectExpression") {
						node.arguments[1] = {
							type: "ObjectExpression",
							properties: [],
							loc: node.arguments[1].loc,
						} satisfies ESTree.ObjectExpression;
					}
					node.arguments[1].properties.push({
						type: "Property",
						computed: false,
						key: {
							type: "Identifier",
							name: "dataset",
						} satisfies ESTree.Identifier,
						kind: "init",
						shorthand: false,
						method: false,
						value: {
							type: "ObjectExpression",
							properties: [
								{
									type: "Property",
									computed: false,
									key: {
										type: "Identifier",
										name: "wzId",
									} satisfies ESTree.Identifier,
									kind: "init",
									shorthand: false,
									method: false,
									value: {
										type: "Literal",
										value: cssId.toString(36),
										loc: node.arguments[1].loc,
									} satisfies ESTree.SimpleLiteral,
									loc: node.arguments[1].loc
								} satisfies ESTree.Property,
							],
						} satisfies ESTree.ObjectExpression,
						loc: node.arguments[1].loc
					} satisfies ESTree.Property)
				}
				visitExpression(node.arguments[1] as ESTree.Expression);
			} else {
				for (let i = 0; i < node.arguments.length; ++i) {
					tempExpression = visitExpression(node.arguments[i]);
					if (tempExpression) node.arguments[i] = tempExpression;
				}
			}
			break;
		}
		case "ObjectExpression": {
			for (const prop of node.properties) {
				if (prop.type === "Property") {
					tempExpression = visitExpression(prop.value);
					if (tempExpression) prop.value = tempExpression;
				}
			}
			break;
		}
		case "UpdateExpression": {
			tempExpression = visitExpression(node.argument);
			if (tempExpression) node.argument = tempExpression;
			break;
		}
		case "BinaryExpression": {
			tempExpression = visitExpression(node.left);
			if (tempExpression) node.left = tempExpression;
			tempExpression = visitExpression(node.right);
			if (tempExpression) node.right = tempExpression;
			break;
		}
		case "SpreadElement": {
			// console.log(node);
			visitExpression(node.argument);
			break;
		}
	}
};

const visitStatementOrProgram = (node: ESTree.Statement | ESTree.Program | ESTree.ModuleDeclaration): undefined | null => {
	switch (node.type) {
		case "Program": case "BlockStatement": {
			for (let i = node.body.length - 1; i >= 0; --i) {
				if (visitStatementOrProgram(node.body[i]) === null) {
					node.body.splice(i, 1);
				};
			}
			break;
		}
		case "VariableDeclaration": {
			let isLet = node.kind === "let";
			let isUsing = (node.kind as string) === "using";
			let declarator: ESTree.VariableDeclarator;
			for (let i = 0; i < node.declarations.length; ++i) {
				declarator = node.declarations[i];
				if (isLet || isUsing) {
					if (declarator.id.type === "Identifier") {
						if (declarator.id.name.endsWith("$")) {
							if (isLet) {
								const newNode: ESTree.NewExpression = {
									type: "NewExpression",
									loc: declarator.init.loc,
									callee: {
										type: "Identifier",
										loc: declarator.init.loc,
										name: "__winzig__Variable",
									} satisfies ESTree.Identifier,
									arguments: [declarator.init],
								};
								declarator.init = newNode;
							} else {
								node.kind = "let";
							}
						}
					}
				}
				tempExpression = visitExpression(declarator.init);
				if (tempExpression) node.declarations[i].init = tempExpression;
			}
			break;
		}
		case "ExpressionStatement": {
			tempExpression = visitExpression(node.expression);
			if (tempExpression) node.expression = tempExpression;
			break;
		}
		case "ReturnStatement": {
			tempExpression = visitExpression(node.argument);
			if (tempExpression) node.argument = tempExpression;
			break;
		}
		case "ImportDeclaration": {
			if (node.source.value === "$appfiles/winzig-runtime.js") {
				for (let i = node.specifiers.length - 1; i >= 0; --i) {
					let specifier = node.specifiers[i];
					if (specifier.type === "ImportSpecifier" && specifier.imported.name === "css") {
						node.specifiers.splice(i, 1);
					}
				}
				if (node.specifiers.length === 0) {
					return null;
				}
			}
		}
	}
};

export const compileAST = (ast: ESTree.Program) => {
	// FS.writeFile("./ast.json", JSON.stringify(ast, null, "\t"));

	cssSnippets = [];
	currentUniqueId = 0;

	visitStatementOrProgram(ast);
	return {
		cssSnippets,
	};
};

