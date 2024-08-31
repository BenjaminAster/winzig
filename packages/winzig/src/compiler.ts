
import type * as ESTree from "estree";

// import * as FS from "node:fs/promises";
// import * as FSSync from "node:fs";

const DEBUG = false;
if (DEBUG) {
	var FSSync = await import("node:fs");
}

let currentUniqueId: number = 0;
const createUniqueId = () => ++currentUniqueId;

const reactiveVarRegExp = /^\w+\$\d?$/;
const cssRegExp = /^css\d?$/;
let noCSSScopeRules: boolean;
let minify: boolean;

const arrayModifyingMethodsSingleLetterMappings: Record<string, string> = Object.assign(Object.create(null), {
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

const AssignmentOperatorMappings = {
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

export const compileAST = (ast: ESTree.Program) => {
	if (DEBUG) FSSync.writeFileSync(`./ast-before.json`, JSON.stringify(ast, (key, value) => typeof value === "bigint" ? Number(value) : value, "\t"));

	let tempExpression: ESTree.Expression;
	let tempStatement: ESTree.Statement;

	let cssSnippets: string[] = [];
	let dependencyStack: (Set<string> | null)[] = [];

	let headCall: ESTree.CallExpression;
	let addTempVarStatement = false;

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

	const wrapIntoLiveVariableOrArray = (expression: ESTree.Expression) => {
		return {
			type: "NewExpression",
			loc: expression.loc,
			callee: {
				type: "Identifier",
				loc: expression.loc,
				name: expression.type === "ArrayExpression" ? "__winzig__LiveArray" : "__winzig__LiveVariable",
			} satisfies ESTree.Identifier,
			arguments: [expression],
		} satisfies ESTree.NewExpression;
	};

	const liveArrayToTempVarIndexed = (array: ESTree.Expression) => {
		return {
			type: "MemberExpression",
			loc: array.loc,
			computed: true,
			optional: false,
			object: {
				type: "MemberExpression",
				loc: array.loc,
				computed: false,
				optional: false,
				object: array,
				property: {
					type: "Identifier",
					name: "v",
				} satisfies ESTree.Identifier
			} satisfies ESTree.MemberExpression,
			property: {
				type: "Identifier",
				loc: array.loc,
				name: "__winzig__tempVariable",
			} satisfies ESTree.Identifier,
		} satisfies ESTree.MemberExpression;
	};

	const wrapIntoTempVarAssignment = (node: ESTree.Expression) => {
		addTempVarStatement = true;
		return {
			type: "AssignmentExpression",
			loc: node.loc,
			operator: "=",
			left: {
				type: "Identifier",
				loc: node.loc,
				name: "__winzig__tempVariable",
			} satisfies ESTree.Identifier,
			right: node,
		} satisfies ESTree.AssignmentExpression;
	};

	const wrapIntoLiveArrayIndexedAssignment = (array: ESTree.Expression, firstArg: ESTree.Expression, secondArg: ESTree.Expression) => {
		return {
			type: "CallExpression",
			loc: array.loc,
			optional: false,
			callee: {
				type: "MemberExpression",
				loc: array.loc,
				computed: false,
				optional: false,
				object: array,
				property: {
					type: "Identifier",
					name: "i",
				} satisfies ESTree.Identifier,
			} satisfies ESTree.MemberExpression,
			arguments: [firstArg, secondArg],
		} satisfies ESTree.CallExpression;
	};

	// #region VISIT CLASS BODY
	const visitClassBody = (node: ESTree.ClassBody) => {
		console.warn("TODO: implement classes");
		// for (const property of node.body) {
		// }
	};
	// #endregion

	// #region VISIT EXPRESSION


	const visitExpression = (node: ESTree.Expression | ESTree.Pattern | ESTree.SpreadElement, leaveLiveVars: boolean = false): ESTree.Expression => {
		if (!node) return;
		switch (node.type) {
			// #region ArrayExpression
			case "ArrayExpression": {
				for (let i = 0; i < node.elements.length; ++i) {
					if (tempExpression = visitExpression(node.elements[i])) node.elements[i] = tempExpression;
				}
				break;
			}
			// #endregion
			// #region ArrayPattern
			case "ArrayPattern": {
				console.warn(`TODO: implement expression: ${node.type}`);
				break;
			}
			// #endregion
			// #region ArrowFunctionExpression
			case "ArrowFunctionExpression": {
				dependencyStack.push(null);
				if (node.expression) {
					if (tempExpression = visitExpression(node.body as ESTree.Expression)) node.body = tempExpression;
				} else {
					visitStatementOrProgram(node.body as ESTree.BlockStatement);
				}
				dependencyStack.pop();
				break;
				// #endregion
				// #region FunctionExpression
			}
			case "FunctionExpression": {
				visitStatementOrProgram(node.body as ESTree.BlockStatement);
				break;
			}
			// #endregion
			// #region AssignmentExpression
			case "AssignmentExpression": {
				if (tempExpression = visitExpression(node.right)) node.right = tempExpression;

				if (
					node.left.type === "Identifier"
					&& reactiveVarRegExp.test(node.left.name)
				) {
					node.left = {
						type: "MemberExpression",
						computed: false,
						loc: node.loc,
						object: node.left,
						optional: false,
						property: {
							type: "Identifier",
							name: "_",
							loc: node.loc,
						} satisfies ESTree.Identifier,
					} satisfies ESTree.MemberExpression;
				} else {
					if (
						node.left.type === "MemberExpression"
						&& node.left.computed
						&& node.left.object.type === "Identifier"
						&& reactiveVarRegExp.test(node.left.object.name)
					) {
						if (tempExpression = visitExpression(node.left.property as ESTree.Expression)) node.left.property = tempExpression;
						if (node.operator === "=") {
							return wrapIntoLiveArrayIndexedAssignment(
								node.left.object,
								node.left.property as ESTree.Expression,
								node.right,
							);
						} else {
							return wrapIntoLiveArrayIndexedAssignment(
								node.left.object,
								wrapIntoTempVarAssignment(node.left.property as ESTree.Expression),
								{
									...(AssignmentOperatorMappings[node.operator] || console.error("Unknown assignment operator:", node.operator) as never),
									left: liveArrayToTempVarIndexed(structuredClone(node.left.object)),
									right: node.right,
								} satisfies (ESTree.LogicalExpression | ESTree.BinaryExpression),
							);
						}
					} else {
						if (tempExpression = visitExpression(node.left)) node.left = tempExpression as ESTree.Pattern;
					}
				}

				break;
			}
			// #endregion
			// #region AssignmentPattern
			case "AssignmentPattern": {
				console.warn(`TODO: implement expression: ${node.type}`);
				break;
			}
			// #endregion
			// #region AwaitExpression
			case "AwaitExpression": {
				visitExpression(node.argument);
				break;
			}
			// #endregion
			// #region LogicalExpression
			case "BinaryExpression": case "LogicalExpression": {
				if (tempExpression = visitExpression(node.left)) node.left = tempExpression;
				if (tempExpression = visitExpression(node.right)) node.right = tempExpression;
				break;
			}
			// #endregion
			// #region CallExpression
			case "CallExpression": {
				if (node.callee.type === "Identifier" && node.callee.name === "__winzig__jsx") {
					let arg: ESTree.Expression | ESTree.SpreadElement;
					let cssId: number;

					let firstArg = node.arguments[0] as ESTree.Expression;
					if (firstArg.type === "Identifier" && firstArg.name === "__winzig__Fragment") {
						node.arguments[0] = firstArg = {
							type: "Literal",
							value: "wz-frag",
							loc: node.arguments[0].loc,
						} satisfies ESTree.SimpleLiteral;
					}
					const elementTypeIsString = firstArg.type === "Literal";

					if (node.arguments.length >= 3) {
						const lastArg = node.arguments.at(-1);
						if (
							(elementTypeIsString)
							&& lastArg.type === "TaggedTemplateExpression"
							&& lastArg.tag.type === "Identifier"
							&& cssRegExp.test(lastArg.tag.name)
						) {
							if (lastArg.quasi.expressions.length > 0) throw new Error("CSS dynamic template string insertions not supported.");
							cssId = createUniqueId();

							let cssString = lastArg.quasi.quasis[0].value.cooked.trim();
							const [firstLine, ...otherLines] = cssString.split("\n");
							const leadingWhitespace = otherLines.at(-1)?.match(/^(\s*)/)[0].length ?? 0;
							cssString = [firstLine, ...otherLines.map(line => line.slice(leadingWhitespace - 1))].join("\n");
							cssSnippets.push(
								noCSSScopeRules
									? `[data-wz-id="${cssId.toString(36)}"] {\n\t${minify
										// Chromium v128 has a weird bug where nested selectors
										// don't get parsed if they start with a tag name and
										// are immediately preceded by a closing brace (i.e. with no whitespace in between).
										// This hack adds an empty `z{}` rule before those selectors
										// that then gets replaced by whitespace afterwards.
										? cssString.replaceAll(
											/}\n(?:[ \t]*\n)*(?<indentation>[ \t]+)(?<firstChar>\w)/g,
											"}\n\n$<indentation>z{}\n$<indentation>$<firstChar>",
										)
										: cssString
									}\n}\n`
									: `@scope ([data-wz-id="${cssId.toString(36)}"]) to ([data-wz-new-scope]) {\n\t${cssString}\n}\n`
							);
							node.arguments.pop();
						}
					}

					for (let i = 2; i < node.arguments.length; ++i) {
						arg = node.arguments[i];
						if (arg.type === "SpreadElement") {
							if (
								arg.argument.type === "CallExpression"
								&& arg.argument.callee.type === "MemberExpression"
								&& arg.argument.callee.property.type === "Identifier"
								&& arg.argument.callee.property.name === "map"
								&& arg.argument.callee.object.type === "Identifier"
								&& reactiveVarRegExp.test(arg.argument.callee.object.name)
							) {
								arg.argument.callee.property.name = "m";
								visitExpression(arg.argument.arguments[0]);
							} else {
								if (tempExpression = visitExpression(arg.argument)) arg.argument = tempExpression;
							}
						} else {
							dependencyStack.push(new Set());
							visitExpression(arg, true);
							if (dependencyStack.at(-1).size) {
								node.arguments[i] = transformToLiveExpression(arg, [...dependencyStack.at(-1)]);
							}
							dependencyStack.pop();
						}
					}

					{
						const arg = node.arguments[1];
						let datasetProperty: ESTree.Property;
						if (arg.type === "ObjectExpression") {
							const listeners: ESTree.ArrayExpression[] = [];
							const reactiveAttributes: ESTree.ArrayExpression[] = [];
							for (let i = arg.properties.length - 1; i >= 0; --i) {
								const property = arg.properties[i];
								if (property.type === "Property") {
									if (property.key.type === "Literal" && (property.key.value as string).startsWith?.("on:")) {
										dependencyStack.push(null);
										// if (tempExpression = visitExpression(property.value)) property.value = tempExpression;
										visitExpression(property.value);
										const [eventName, ...modifiers] = (property.key.value as string).slice(3).split("_");
										listeners.push({
											type: "ArrayExpression",
											loc: property.loc,
											elements: [
												{
													type: "Literal",
													loc: property.loc,
													value: eventName,
												} satisfies ESTree.SimpleLiteral,
												modifiers.includes("preventDefault")
													? {
														type: "FunctionExpression",
														loc: property.value.loc,
														params: [
															{
																type: "Identifier",
																name: "__winzig__event",
															} satisfies ESTree.Identifier
														],
														body: {
															type: "BlockStatement",
															body: [
																{
																	type: "ExpressionStatement",
																	expression: {
																		type: "CallExpression",
																		arguments: [],
																		optional: false,
																		callee: {
																			type: "MemberExpression",
																			computed: false,
																			object: {
																				// What, code *shouldn't* be indented 20 levels deep, you say??
																				type: "Identifier",
																				name: "__winzig__event",
																			} satisfies ESTree.Identifier,
																			property: {
																				type: "Identifier",
																				name: "preventDefault",
																			} satisfies ESTree.Identifier,
																			optional: false,
																		} satisfies ESTree.MemberExpression,
																	} satisfies ESTree.CallExpression,
																} satisfies ESTree.ExpressionStatement,
																{
																	type: "ExpressionStatement",
																	expression: {
																		type: "CallExpression",
																		callee: {
																			type: "MemberExpression",
																			computed: false,
																			optional: false,
																			object: property.value as ESTree.Expression,
																			property: {
																				type: "Identifier",
																				name: "call",
																			} satisfies ESTree.Identifier,
																		} satisfies ESTree.MemberExpression,
																		arguments: [
																			{
																				type: "ThisExpression",
																			} satisfies ESTree.ThisExpression,
																			{
																				type: "Identifier",
																				name: "__winzig__event",
																			} satisfies ESTree.Identifier,
																		],
																		optional: false,
																	} satisfies ESTree.CallExpression,
																} satisfies ESTree.ExpressionStatement,
															],
														} satisfies ESTree.BlockStatement,
													} satisfies ESTree.FunctionExpression
													: property.value as ESTree.Expression,
											],
										} satisfies ESTree.ArrayExpression);
										arg.properties.splice(i, 1);
										dependencyStack.pop();
									} else if (property.key.type === "Identifier") {
										if (property.key.name === "dataset") datasetProperty = property;
										const isReactiveIdentifier =
											property.value.type === "Identifier"
											&& reactiveVarRegExp.test(property.value.name);
										dependencyStack.push(new Set());
										if (tempExpression = visitExpression(property.value, isReactiveIdentifier)) property.value = tempExpression;
										if (dependencyStack.at(-1).size) {
											property.value = transformToLiveExpression(property.value as ESTree.Expression, [...dependencyStack.at(-1)]);
										}
										if (isReactiveIdentifier || dependencyStack.at(-1).size) {
											reactiveAttributes.push({
												type: "ArrayExpression",
												loc: property.loc,
												elements: [
													{
														type: "Literal",
														loc: property.loc,
														value: property.key.name,
													} satisfies ESTree.SimpleLiteral,
													property.value as ESTree.Expression,
												],
											} satisfies ESTree.ArrayExpression);
											arg.properties.splice(i, 1);
										}
										dependencyStack.pop();
									}
								} else {
									visitExpression(property.argument);
								}
							}
							if (listeners.length) {
								arg.properties.push({
									type: "Property",
									computed: false,
									key: {
										type: "Identifier",
										name: "_l",
									} satisfies ESTree.Identifier,
									kind: "init",
									method: false,
									shorthand: false,
									value: {
										type: "ArrayExpression",
										elements: listeners,
									} satisfies ESTree.ArrayExpression,
								} satisfies ESTree.Property);
							}
							if (reactiveAttributes.length) {
								arg.properties.push({
									type: "Property",
									computed: false,
									key: {
										type: "Identifier",
										name: "_r",
									} satisfies ESTree.Identifier,
									kind: "init",
									method: false,
									shorthand: false,
									value: {
										type: "ArrayExpression",
										elements: reactiveAttributes,
									} satisfies ESTree.ArrayExpression,
								} satisfies ESTree.Property);
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
							if (!datasetProperty) {
								node.arguments[1].properties.push(datasetProperty = {
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
										],
									} satisfies ESTree.ObjectExpression,
									loc: node.arguments[1].loc,
								} satisfies ESTree.Property);
							}
							(datasetProperty.value as ESTree.ObjectExpression).properties.push(
								// TODO: handle edge case where `dataset={myDataset}` must get transformed to `dataset={{ ...myDataset, wzId: 123 }}
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
									loc: node.arguments[1].loc,
								} satisfies ESTree.Property
							);
						}
					}

					if (elementTypeIsString) {
						if ((firstArg as ESTree.Literal).value === "html") {
							const expressions: ESTree.Expression[] = [];
							let bodyCall: ESTree.CallExpression;
							[headCall, bodyCall] = node.arguments.splice(2) as ESTree.CallExpression[];
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
							// const separatorIdentifier: ESTree.SimpleLiteral = {
							// 	type: "Literal",
							// 	value: "__$WZ_SEPARATOR__",
							// };
							// expressions.push(separatorIdentifier);
							// expressions.push(headCall);
							// expressions.push(structuredClone(separatorIdentifier));
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
									name: (firstArg as ESTree.Literal).value as string,
									loc: firstArg.loc,
								} satisfies ESTree.Identifier,
							} satisfies ESTree.MemberExpression;
						} else {
							node.arguments[0] = {
								type: "CallExpression",
								loc: node.loc,
								optional: false,
								arguments: [node.arguments[0]],
								callee: {
									type: "Identifier",
									name: "__winzig__createElement",
								} satisfies ESTree.Identifier,
							} satisfies ESTree.CallExpression;
						}
						// else if ((firstArg as ESTree.Literal).value === "slot") {
						// 	// node.arguments[0] = {
						// 	// 	type: "Identifier",
						// 	// 	name: "__winzig__Slot",
						// 	// 	loc: firstArg.loc,
						// 	// } satisfies ESTree.Identifier;
						// 	node.arguments = [];
						// 	node.callee.name = "__winzig__jsxSlot";
						// }
					}
				} else {
					if (
						node.callee.type === "MemberExpression"
						&& node.callee.object.type === "Identifier"
						&& reactiveVarRegExp.test(node.callee.object.name)
						&& node.callee.property.type === "Identifier"
						&& (node.callee.property.name in arrayModifyingMethodsSingleLetterMappings)
					) {
						node.callee.property.name = arrayModifyingMethodsSingleLetterMappings[node.callee.property.name];
					} else {
						if (tempExpression = visitExpression(node.callee as ESTree.Expression)) node.callee = tempExpression;
					}
					for (let i = 0; i < node.arguments.length; ++i) {
						if (tempExpression = visitExpression(node.arguments[i])) node.arguments[i] = tempExpression;
					}
				}

				break;
			}
			// #endregion
			// #region ChainExpression
			case "ChainExpression": {
				if (tempExpression = visitExpression(node.expression) as ESTree.ChainElement) node.expression = tempExpression;
				break;
			}
			// #endregion
			// #region ClassExpression
			case "ClassExpression": {
				visitClassBody(node.body);
				break;
			}
			// #endregion
			// #region ConditionalExpression
			case "ConditionalExpression": {
				if (tempExpression = visitExpression(node.test)) node.test = tempExpression;
				if (tempExpression = visitExpression(node.consequent)) node.consequent = tempExpression;
				if (tempExpression = visitExpression(node.alternate)) node.alternate = tempExpression;
				break;
			}
			// case "FunctionExpression": see case "ArrowFunctionExpression"
			// #endregion
			// #region Identifier
			case "Identifier": {
				if (!leaveLiveVars && reactiveVarRegExp.test(node.name)) {
					if (dependencyStack.length) dependencyStack.at(-1)?.add(node.name);
					return {
						type: "MemberExpression",
						computed: false,
						loc: node.loc,
						object: node,
						optional: false,
						property: {
							type: "Identifier",
							name: "v",
							loc: node.loc,
						} satisfies ESTree.Identifier,
					} satisfies ESTree.MemberExpression;
				}
				break;
			}
			// #endregion
			// #region ImportExpression
			case "ImportExpression": {
				console.warn(`TODO: implement expression: ${node.type}`);
				break;
			}
			// #endregion
			// #region Literal
			case "Literal": {
				break;
			}
			// case "LogicalExpression": see case "BinaryExpression"
			// #endregion
			// #region MemberExpression
			case "MemberExpression": {
				if (tempExpression = visitExpression(node.object as ESTree.Expression)) node.object = tempExpression;

				if (
					// !leaveLiveVars
					// &&
					node.property.type === "Identifier"
					&& reactiveVarRegExp.test(node.property.name)
				) {
					return {
						type: "MemberExpression",
						loc: node.loc,
						computed: false,
						optional: false,
						object: node,
						property: {
							type: "Identifier",
							name: "_",
						} satisfies ESTree.Identifier,
					} satisfies ESTree.MemberExpression;
				} else {
					if (tempExpression = visitExpression(node.property as ESTree.Expression)) node.property = tempExpression;
				}
				break;
			}
			// #endregion
			// #region MetaProperty
			case "MetaProperty": {
				console.warn(`TODO: implement expression: ${node.type}`);
				break;
			}
			// #endregion
			// #region NewExpression
			case "NewExpression": {
				if (node.callee.type !== "Super") visitExpression(node.callee);
				for (let i = 0; i < node.arguments.length; ++i) {
					if (tempExpression = visitExpression(node.arguments[i])) node.arguments[i] = tempExpression;
				}
				break;
			}
			// #endregion
			// #region ObjectExpression
			case "ObjectExpression": {
				for (const prop of node.properties) {
					if (prop.type === "Property") {
						if (prop.key.type === "Identifier" && reactiveVarRegExp.test((prop.key as ESTree.Identifier).name)) {
							prop.value = wrapIntoLiveVariableOrArray(visitExpression(prop.value as ESTree.Expression, true) ?? prop.value as ESTree.Expression);
						} else if (tempExpression = visitExpression(prop.value)) prop.value = tempExpression;
					}
				}
				break;
			}
			// #endregion
			// #region ObjectPattern
			case "ObjectPattern": {
				console.warn(`TODO: implement expression: ${node.type}`);
				break;
			}
			// #endregion
			// #region RestElement
			case "RestElement": {
				console.warn(`TODO: implement expression: ${node.type}`);
				break;
			}
			// #endregion
			// #region SequenceExpression
			case "SequenceExpression": {
				for (let i = 0; i < node.expressions.length; ++i) {
					if (tempExpression = visitExpression(node.expressions[i])) node.expressions[i] = tempExpression;
				}
				break;
			}
			// #endregion
			// #region SpreadElement
			case "SpreadElement": {
				if (tempExpression = visitExpression(node.argument)) node.argument = tempExpression;
				break;
			}
			// #endregion
			// #region TaggedTemplateExpression
			case "TaggedTemplateExpression": {
				console.warn(`TODO: implement expression: ${node.type}`);
				break;
			}
			// #endregion
			// #region TemplateLiteral
			case "TemplateLiteral": {
				for (let i = 0; i < node.expressions.length; ++i) {
					if (tempExpression = visitExpression(node.expressions[i])) node.expressions[i] = tempExpression;
				}
				break;
			}
			// #endregion
			// #region ThisExpression
			case "ThisExpression": {
				break;
			}
			// #endregion
			// #region {Unary/Yield}Expression
			case "UnaryExpression": case "YieldExpression": {
				if (tempExpression = visitExpression(node.argument)) node.argument = tempExpression;
				break;
			}
			// #endregion
			// #region UpdateExpression
			case "UpdateExpression": {
				if (
					node.argument.type === "Identifier"
					&& reactiveVarRegExp.test(node.argument.name)
				) {
					node.argument = {
						type: "MemberExpression",
						computed: false,
						loc: node.loc,
						object: node.argument,
						optional: false,
						property: {
							type: "Identifier",
							name: "_",
							loc: node.loc,
						} satisfies ESTree.Identifier,
					} satisfies ESTree.MemberExpression;
				} else {
					if (
						node.argument.type === "MemberExpression"
						&& node.argument.computed
						&& node.argument.object.type === "Identifier"
						&& reactiveVarRegExp.test(node.argument.object.name)
					) {
						if (tempExpression = visitExpression(node.argument.property as ESTree.Expression)) node.argument.property = tempExpression;
						const tempVarIndexedExpression = liveArrayToTempVarIndexed(structuredClone(node.argument.object));
						const mainExpression = wrapIntoLiveArrayIndexedAssignment(
							node.argument.object,
							wrapIntoTempVarAssignment(node.argument.property as ESTree.Expression),
							{
								type: "BinaryExpression",
								operator: node.operator[0] as ESTree.BinaryOperator,
								left: node.prefix
									? tempVarIndexedExpression
									: wrapIntoTempVarAssignment(tempVarIndexedExpression),
								right: {
									type: "Literal",
									value: 1,
									loc: node.argument.property.loc,
								} satisfies ESTree.SimpleLiteral,
							} satisfies ESTree.BinaryExpression,
						);
						return node.prefix
							? mainExpression
							: {
								type: "SequenceExpression",
								expressions: [
									mainExpression,
									{
										type: "Identifier",
										loc: node.loc,
										name: "__winzig__tempVariable",
									} satisfies ESTree.Identifier,
								],
							} satisfies ESTree.SequenceExpression;
					} else {
						if (tempExpression = visitExpression(node.argument)) node.argument = tempExpression;
					}
				}
				break;
			};
			// #endregion
			// case "YieldExpression": see case "UnaryExpression"
			default: {
				console.error(`Unknown expression type: ${(node as any).type}`);
				break;
			}
		}
	};
	// #endregion

	// #region VISIT STATEMENT



	const visitStatementOrProgram = (node: ESTree.Statement | ESTree.Program | ESTree.ModuleDeclaration): ESTree.Statement | null | undefined => {
		switch (node.type) {
			// #region Program
			case "BlockStatement": case "Program": {
				for (let i = node.body.length - 1; i >= 0; --i) {
					if (tempStatement = visitStatementOrProgram(node.body[i])) {
						node.body[i] = tempStatement;
					} else if (tempStatement === null) {
						node.body.splice(i, 1);
					};
				}
				break;
			}
			// #endregion
			// #region BreakStatement
			case "BreakStatement": {
				break;
			}
			// #endregion
			// #region ClassDeclaration
			case "ClassDeclaration": {
				visitClassBody(node.body);
				break;
			}
			// #endregion
			// #region ContinueStatement
			case "ContinueStatement": {
				break;
			}
			// #endregion
			// #region DebuggerStatement
			case "DebuggerStatement": {
				break;
			}
			// #endregion
			// #region DoWhileStatement
			case "DoWhileStatement": {
				visitStatementOrProgram(node.body);
				if (tempExpression = visitExpression(node.test)) node.test = tempExpression;
				break;
			}
			// #endregion
			// #region EmptyStatement
			case "EmptyStatement": {
				break;
			}
			// #endregion
			// #region ExportAllDeclaration
			case "ExportAllDeclaration": {
				console.warn("TODO: implement statement: ExportAllDeclaration");
				node.type;
				break;
			}
			// #endregion
			// #region ExpressionStatement
			case "ExpressionStatement": {
				if (tempExpression = visitExpression(node.expression)) node.expression = tempExpression;
				break;
			}
			// #endregion
			// #region ExportDefaultDeclaration
			case "ExportDefaultDeclaration": {
				console.warn("TODO: implement statement: ExportDefaultDeclaration");
				node.type;
				break;
			}
			// #endregion
			// #region ExportNamedDeclaration
			case "ExportNamedDeclaration": {
				console.warn("TODO: implement statement: ExportNamedDeclaration");
				node.type;
				break;
			}
			// #endregion
			// #region ForOfStatement
			case "ForInStatement": case "ForOfStatement": {
				if (tempExpression = visitExpression(node.right)) node.right = tempExpression;
				visitStatementOrProgram(node.body);
				break;
			}
			// case "ForOfStatement": see case "ForInStatement"
			// #endregion
			// #region ForStatement
			case "ForStatement": {
				if (node.init.type === "VariableDeclaration") visitStatementOrProgram(node.init);
				else if (tempExpression = visitExpression(node.init)) node.init = tempExpression;
				if (tempExpression = visitExpression(node.test)) node.test = tempExpression;
				if (tempExpression = visitExpression(node.update)) node.update = tempExpression;
				visitStatementOrProgram(node.body);
				break;
			}
			// #endregion
			// #region FunctionDeclaration
			case "FunctionDeclaration": {
				visitStatementOrProgram(node.body);
				break;
			}
			// #endregion
			// #region IfStatement
			case "IfStatement": {
				if (tempExpression = visitExpression(node.test)) node.test = tempExpression;
				visitStatementOrProgram(node.consequent);
				if (node.alternate) visitStatementOrProgram(node.alternate);
				break;
			}
			// #endregion
			// #region ImportDeclaration
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
			// #endregion
			// #region LabeledStatement
			case "LabeledStatement": {
				if (node.label.name === "$") {
					if (node.body.type === "ExpressionStatement" && node.body.expression.type === "ArrowFunctionExpression") {
						dependencyStack.push(new Set());
						if (node.body.expression.expression) {
							visitExpression(node.body.expression.body as ESTree.Expression);
						} else {
							visitStatementOrProgram(node.body.expression.body as ESTree.BlockStatement);
						}
						if (dependencyStack.at(-1).size) {
							const returnStatement = {
								type: "ExpressionStatement",
								expression: {
									type: "CallExpression",
									optional: false,
									loc: node.loc,
									arguments: [
										{
											type: "ArrowFunctionExpression",
											body: node.body.expression.body,
											expression: node.body.expression.expression,
											params: [] as any[],
										} satisfies ESTree.ArrowFunctionExpression,
										...[...dependencyStack.at(-1)].map((dependency) => ({
											type: "Identifier",
											name: dependency,
											loc: node.loc,
										} satisfies ESTree.Identifier)),
									],
									callee: {
										type: "Identifier",
										name: "__winzig__addListeners",
										loc: node.loc,
									} satisfies ESTree.Identifier,
								} satisfies ESTree.CallExpression,
							} satisfies ESTree.ExpressionStatement;
							dependencyStack.pop();
							return returnStatement;
						}
						dependencyStack.pop();
					} else {
						dependencyStack.push(new Set());
						visitStatementOrProgram(node.body);
						if (dependencyStack.at(-1).size) {
							const returnStatement = {
								type: "BlockStatement",
								loc: node.loc,
								body: [
									{
										type: "VariableDeclaration",
										kind: "const",
										loc: node.loc,
										declarations: [
											{
												type: "VariableDeclarator",
												id: {
													type: "Identifier",
													name: "__winzig__tempFunction",
												} satisfies ESTree.Identifier,
												loc: node.loc,
												init: {
													type: "ArrowFunctionExpression",
													params: [] as any[],
													expression: false,
													loc: node.loc,
													body: node.body.type === "BlockStatement" ? node.body : {
														type: "BlockStatement",
														loc: node.loc,
														body: [node.body],
													} satisfies ESTree.BlockStatement,
												} satisfies ESTree.ArrowFunctionExpression,
											} satisfies ESTree.VariableDeclarator,
										],
									} satisfies ESTree.VariableDeclaration,
									{
										type: "ExpressionStatement",
										expression: {
											type: "CallExpression",
											arguments: [],
											callee: {
												type: "Identifier",
												name: "__winzig__tempFunction",
												loc: node.loc,
											} satisfies ESTree.Identifier,
											optional: false,
											loc: node.loc,
										} satisfies ESTree.CallExpression,
									} satisfies ESTree.ExpressionStatement,
									{
										type: "ExpressionStatement",
										expression: {
											type: "CallExpression",
											optional: false,
											loc: node.loc,
											arguments: [
												{
													type: "Identifier",
													name: "__winzig__tempFunction",
												} satisfies ESTree.Identifier,
												...[...dependencyStack.at(-1)].map((dependency) => ({
													type: "Identifier",
													name: dependency,
													loc: node.loc,
												} satisfies ESTree.Identifier))
											],
											callee: {
												type: "Identifier",
												name: "__winzig__addListeners",
												loc: node.loc,
											} satisfies ESTree.Identifier,
										} satisfies ESTree.CallExpression,
									} satisfies ESTree.ExpressionStatement,
								],
							} satisfies ESTree.BlockStatement;
							dependencyStack.pop();
							return returnStatement;
						}
					}
					dependencyStack.pop();
				} else if (node.label.name === "winzigConfig") {
					return null;
				} else {
					visitStatementOrProgram(node.body);
				}
				break;
			};
			// case "Program": see case "BlockStatement"
			// #endregion
			// #region ReturnStatement
			case "ReturnStatement": {
				if (tempExpression = visitExpression(node.argument)) node.argument = tempExpression;
				break;
			}
			// #endregion
			// #region StaticBlock
			case "StaticBlock": {
				node.body.forEach(visitStatementOrProgram);
				break;
			}
			// #endregion
			// #region SwitchStatement
			case "SwitchStatement": {
				if (tempExpression = visitExpression(node.discriminant)) node.discriminant = tempExpression;
				for (const switchCase of node.cases) {
					if (tempExpression = visitExpression(switchCase.test)) switchCase.test = tempExpression;
					switchCase.consequent.forEach(visitStatementOrProgram);
				}
				break;
			}
			// #endregion
			// #region ThrowStatement
			case "ThrowStatement": {
				if (tempExpression = visitExpression(node.argument)) node.argument = tempExpression;
				break;
			}
			// #endregion
			// #region TryStatement
			case "TryStatement": {
				visitStatementOrProgram(node.block);
				if (node.finalizer) visitStatementOrProgram(node.finalizer);
				if (node.handler?.body) visitStatementOrProgram(node.handler.body);
				break;
			}
			// #endregion
			// #region VariableDeclaration
			case "VariableDeclaration": {
				let isVar = node.kind === "let" || node.kind === "var";
				let isUsing = (node.kind as string) === "using";
				let declarator: ESTree.VariableDeclarator;
				for (let i = 0; i < node.declarations.length; ++i) {
					declarator = node.declarations[i];
					if (isVar || isUsing) {
						if (declarator.id.type === "Identifier" && reactiveVarRegExp.test(declarator.id.name)) {
							if (isVar) {
								// const newNode: ESTree.NewExpression = {
								// 	type: "NewExpression",
								// 	loc: declarator.init.loc,
								// 	callee: {
								// 		type: "Identifier",
								// 		loc: declarator.init.loc,
								// 		name: "__winzig__LiveVariable",
								// 	} satisfies ESTree.Identifier,
								// 	arguments: [visitExpression(declarator.init) ?? declarator.init],
								// };
								// declarator.init = newNode;
								declarator.init = wrapIntoLiveVariableOrArray(visitExpression(declarator.init) ?? declarator.init);
							} else {
								node.kind = "let";
								dependencyStack.push(new Set());
								visitExpression(declarator.init, true);
								if (dependencyStack.at(-1).size) {
									declarator.init = transformToLiveExpression(declarator.init, [...dependencyStack.at(-1)]);
								}
								dependencyStack.pop();
							}
							continue;
						}
					}
					if (tempExpression = visitExpression(declarator.init, true)) declarator.init = tempExpression;
				}
				break;
			}
			// #endregion
			// #region WhileStatement
			case "WhileStatement": {
				if (tempExpression = visitExpression(node.test)) node.test = tempExpression;
				visitStatementOrProgram(node.body);
				break;
			}
			// #endregion
			// #region WithStatement
			case "WithStatement": {
				console.warn("TODO: implement statement: WithStatement");
				node.type;
				break;
			}
			// #endregion
			default: {
				console.error(`Unknown statement type: ${(node as any).type}`);
				break;
			}
		}
	};
	// #endregion

	visitStatementOrProgram(ast);
	ast.body.push(
		{
			type: "ExpressionStatement",
			expression: {
				type: "Literal",
				value: "__$WZ_SEPARATOR__",
			} satisfies ESTree.SimpleLiteral,
		} satisfies ESTree.ExpressionStatement,
		{
			type: "ExpressionStatement",
			expression: headCall,
		} satisfies ESTree.ExpressionStatement,
	);
	if (addTempVarStatement) {
		ast.body.splice(1, 0, {
			type: "VariableDeclaration",
			kind: "var",
			declarations: [{
				type: "VariableDeclarator",
				id: {
					type: "Identifier",
					name: "__winzig__tempVariable",
				} satisfies ESTree.Identifier,
			} satisfies ESTree.VariableDeclarator],
		} satisfies ESTree.VariableDeclaration);
	}

	if (DEBUG) FSSync.writeFileSync(`./ast-after.json`, JSON.stringify(ast, (key, value) => typeof value === "bigint" ? Number(value) : value, "\t"));

	return {
		cssSnippets,
	};
};

export const init = (options: { noCSSScopeRules: boolean, minify: boolean; }) => {
	currentUniqueId = 0;
	noCSSScopeRules = options.noCSSScopeRules;
	minify = options.minify;
};
