
import type * as ESTree from "estree";

import * as FS from "node:fs/promises";

let currentUniqueId: number = 0;
const createUniqueId = () => ++currentUniqueId;

const reactiveVarRegExp = /\$\d?$/;

export const compileAST = (ast: ESTree.Program) => {
	FS.writeFile("./ast.json", JSON.stringify(ast, null, "\t"));

	let tempExpression: ESTree.Expression;

	let cssSnippets: string[] = [];
	let dependencyStack: (Set<string> | null)[] = [];
	let dependencyDeterminationDepth = 0;

	const transformToLiveExpression = (node: ESTree.Expression, dependencies: string[]) => {
		return {
			type: "CallExpression",
			optional: false,
			loc: node.loc,
			arguments: [
				{
					type: "ArrowFunctionExpression",
					params: [] as ESTree.Pattern[],
					expression: true,
					loc: node.loc,
					body: node,
				} satisfies ESTree.ArrowFunctionExpression,
				...dependencies.map((dependency) => ({
					type: "Identifier",
					name: dependency,
					loc: node.loc,
				} satisfies ESTree.Identifier))
			],
			callee: {
				type: "Identifier",
				name: "__winzig__liveExpression",
				loc: node.loc,
			} satisfies ESTree.Identifier,
		} satisfies ESTree.CallExpression;
	};

	const visitExpression = (node: ESTree.Expression | ESTree.Pattern | ESTree.SpreadElement, leaveLiveVars: boolean = false) => {
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
				if (!leaveLiveVars && reactiveVarRegExp.test(node.name)) {
					if (dependencyDeterminationDepth) dependencyStack.at(-1)?.add(node.name);
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
					const firstArg = node.arguments[0];
					const isStandardElement = firstArg.type === "Literal";
					const isFragment = firstArg.type === "Identifier" && firstArg.name === "__winzig__Fragment";
					let arg: ESTree.Expression | ESTree.SpreadElement;
					let cssId: number;

					if (node.arguments.length >= 3) {
						const lastArg = node.arguments.at(-1);
						if (
							(isStandardElement || isFragment)
							&& lastArg.type === "TaggedTemplateExpression"
							&& lastArg.tag.type === "Identifier"
							&& lastArg.tag.name === "css"
						) {
							if (lastArg.quasi.expressions.length > 0) throw new Error("CSS dynamic Template string insertions not supported.");
							cssId = createUniqueId();

							let cssString = lastArg.quasi.quasis[0].value.cooked.trim();
							const [firstLine, ...otherLines] = cssString.split("\n");
							const leadingWhitespace = otherLines.at(-1).match(/^(\s*)/)[0].length;
							cssString = [firstLine, ...otherLines.map(line => line.slice(leadingWhitespace - 1))].join("\n");
							cssSnippets.push(`@scope ([data-wz-id="${cssId.toString(36)}"]) to ([data-wz-new-scope]) {\n\t${cssString}\n}\n`);
							node.arguments.pop();
						}
					}

					if (isFragment) {
						node.arguments[0] = {
							type: "Literal",
							value: "wz-frag",
							loc: node.arguments[0].loc,
						} satisfies ESTree.SimpleLiteral;
					}

					for (let i = 2; i < node.arguments.length; ++i) {
						arg = node.arguments[i];
						if (arg.type === "SpreadElement") {
							let spreadItem = arg.argument;
							++dependencyDeterminationDepth;
							dependencyStack.push(new Set());
							tempExpression = visitExpression(spreadItem);
							if (tempExpression) spreadItem = tempExpression;
							if (dependencyStack.at(-1).size) {
								node.arguments[i] = {
									type: "CallExpression",
									callee: {
										type: "Identifier",
										name: "__winzig__liveFragment",
										loc: arg.loc,
									} satisfies ESTree.Identifier,
									optional: false,
									arguments: [
										transformToLiveExpression(spreadItem, [...dependencyStack.at(-1)]),
									],
								} satisfies ESTree.CallExpression;
							}
							dependencyStack.pop();
							--dependencyDeterminationDepth;
						} else {
							++dependencyDeterminationDepth;
							dependencyStack.push(new Set());
							visitExpression(arg, true);
							if (dependencyStack.at(-1).size) {
								node.arguments[i] = transformToLiveExpression(arg, [...dependencyStack.at(-1)]);
							}
							dependencyStack.pop();
							--dependencyDeterminationDepth;
						}
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
						} satisfies ESTree.Property);
					}
					{
						++dependencyDeterminationDepth;
						dependencyStack.push(null);
						visitExpression(node.arguments[1] as ESTree.Expression);
						--dependencyDeterminationDepth;
						dependencyStack.pop();
					}

					if (isStandardElement) {
						if ((firstArg as ESTree.Literal).value === "html") {
							const expressions: ESTree.Expression[] = [];
							const [headCall, bodyCall] = node.arguments.splice(2) as ESTree.CallExpression[];
							node.arguments[0] = {
								type: "MemberExpression",
								computed: false,
								loc: firstArg.loc,
								optional: false,
								object: {
									type: "Identifier",
									name: "document",
									loc: firstArg.loc,
								} satisfies ESTree.Identifier,
								property: {
									type: "Identifier",
									name: "documentElement",
									loc: firstArg.loc,
								} satisfies ESTree.Identifier,
							} satisfies ESTree.MemberExpression;
							expressions.push(node);

							// const separatorIdentifier: ESTree.Identifier = {
							// 	type: "Identifier",
							// 	name: "__$WZ_SEPARATOR__"
							// };
							const separatorIdentifier: ESTree.SimpleLiteral = {
								type: "Literal",
								value: "__$WZ_SEPARATOR__",
							};
							expressions.push(separatorIdentifier);
							expressions.push(headCall);
							expressions.push(structuredClone(separatorIdentifier));
							expressions.push({
								type: "AssignmentExpression",
								operator: "=",
								left: {
									type: "MemberExpression",
									object: {
										type: "MemberExpression",
										object: {
											type: "Identifier",
											name: "document",
										} satisfies ESTree.Identifier,
										computed: false,
										property: {
											type: "Identifier",
											name: "body",
										} satisfies ESTree.Identifier,
										optional: false,
									} satisfies ESTree.MemberExpression,
									computed: false,
									property: {
										type: "Identifier",
										name: "textContent",
									} satisfies ESTree.Identifier,
									optional: false,
								} satisfies ESTree.MemberExpression,
								right: {
									type: "Literal",
									value: "",
								} satisfies ESTree.Literal,
							} satisfies ESTree.AssignmentExpression);
							expressions.push(bodyCall);

							const expression = {
								type: "SequenceExpression",
								expressions,
							} satisfies ESTree.SequenceExpression;
							return expression;
						} else if (["head", "body"].includes((firstArg as ESTree.Literal).value as string)) {
							node.arguments[0] = {
								type: "MemberExpression",
								computed: false,
								loc: firstArg.loc,
								optional: false,
								object: {
									type: "Identifier",
									name: "document",
									loc: firstArg.loc,
								} satisfies ESTree.Identifier,
								property: {
									type: "Identifier",
									name: firstArg.value as string,
									loc: firstArg.loc,
								} satisfies ESTree.Identifier,
							} satisfies ESTree.MemberExpression;
						} else if ((firstArg as ESTree.Literal).value === "slot") {
							// node.arguments[0] = {
							// 	type: "Identifier",
							// 	name: "__winzig__Slot",
							// 	loc: firstArg.loc,
							// } satisfies ESTree.Identifier;
							node.arguments = [];
							node.callee.name = "__winzig__jsxSlot";
						}
					}
				} else {
					tempExpression = visitExpression(node.callee as ESTree.Expression);
					if (tempExpression) node.callee = tempExpression;
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
				tempExpression = visitExpression(node.argument);
				if (tempExpression) node.argument = tempExpression;
				break;
			}
			case "SequenceExpression": {
				for (let i = 0; i < node.expressions.length; ++i) {
					tempExpression = visitExpression(node.expressions[i]);
					if (tempExpression) node.expressions[i] = tempExpression;
				}
				break;
			}
			case "MemberExpression": {
				tempExpression = visitExpression(node.object as ESTree.Expression);
				if (tempExpression) node.object = tempExpression;
				tempExpression = visitExpression(node.property as ESTree.Expression);
				if (tempExpression) node.property = tempExpression;
				break;
			}
			case "AssignmentExpression": {
				tempExpression = visitExpression(node.left);
				if (tempExpression) node.left = tempExpression as ESTree.Pattern;
				tempExpression = visitExpression(node.right);
				if (tempExpression) node.right = tempExpression;
				break;
			}
			case "ArrayExpression": {
				for (let i = 0; i < node.elements.length; ++i) {
					tempExpression = visitExpression(node.elements[i]);
					if (tempExpression) node.elements[i] = tempExpression;
				}
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
				let isVar = node.kind === "let" || node.kind === "var";
				let isUsing = (node.kind as string) === "using";
				let declarator: ESTree.VariableDeclarator;
				for (let i = 0; i < node.declarations.length; ++i) {
					declarator = node.declarations[i];
					if (isVar || isUsing) {
						if (declarator.id.type === "Identifier" && reactiveVarRegExp.test(declarator.id.name)) {
							if (isVar) {
								const newNode: ESTree.NewExpression = {
									type: "NewExpression",
									loc: declarator.init.loc,
									callee: {
										type: "Identifier",
										loc: declarator.init.loc,
										name: "__winzig__LiveVariable",
									} satisfies ESTree.Identifier,
									arguments: [visitExpression(declarator.init) ?? declarator.init],
								};
								declarator.init = newNode;
							} else {
								node.kind = "let";
								++dependencyDeterminationDepth;
								dependencyStack.push(new Set());
								visitExpression(declarator.init, true);
								if (dependencyStack.at(-1).size) {
									declarator.init = transformToLiveExpression(declarator.init, [...dependencyStack.at(-1)]);
								}
								dependencyStack.pop();
								--dependencyDeterminationDepth;
							}
							continue;
						}
					}
					tempExpression = visitExpression(declarator.init, true);
					if (tempExpression) declarator.init = tempExpression;
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
				break;
			}
		}
	};

	visitStatementOrProgram(ast);

	return {
		cssSnippets,
	};
};

export const reset = () => {
	currentUniqueId = 0;
};
