
import type * as ESTree from "estree";

let FSSync: typeof import("node:fs");

import {
	AssignmentOperatorMappings,
	arrayModifyingMethodsSingleLetterMappings,
	mathMLElements,
	svgElements,
	tagNameToDocumentPropertyMappings,
} from "./constants.ts";

const createUniqueIdGenerator = () => {
	let currentId: number = 0;
	const func = function () {
		return ++currentId;
	} as { reset(): void; (): number; };
	func.reset = () => currentId = 0;
	return func;
};

const getUniqueCSSId = createUniqueIdGenerator();
const getUniqueFunctionId = createUniqueIdGenerator();

const reactiveIdentifierRegExp = /^\w+\$\d?$/;
const cssRegExp = /^css\d?$/;
let noCSSScopeRules: boolean;
let minify: boolean;
let debug: boolean;

export const compileAST = (ast: ESTree.Program, info: { name: string; }) => {
	if (debug) FSSync.writeFileSync(`./ast-${info.name}-before.json`, JSON.stringify(ast, (key, value) => typeof value === "bigint" ? Number(value) : value, "\t"));

	let tempExpression: ESTree.Expression;
	let tempStatement: ESTree.Statement;

	let cssSnippets: string[] = [];
	let dependencyStack: (Set<string> | null)[] = [];
	let elementScopesIdStack: { id: number; elementCount: number; }[] = [
		{
			id: getUniqueFunctionId(),
			elementCount: 0,
		},
	];

	let headStatements: ESTree.Statement[] = [];
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

	const createAddListenersExpression = (func: ESTree.Expression, immediatelyCallOnce: boolean, dependencies: Set<string>) => {
		return {
			type: "CallExpression",
			optional: false,
			arguments: [
				func,
				{
					type: "Literal",
					value: immediatelyCallOnce,
				} satisfies ESTree.SimpleLiteral,
				...[...dependencies].map((dependency) => ({
					type: "Identifier",
					name: dependency,
				} satisfies ESTree.Identifier)),
			],
			callee: {
				type: "Identifier",
				name: "__winzig__addListeners",
			} satisfies ESTree.Identifier,
		} satisfies ESTree.CallExpression;
	};

	const createDatasetAssignmentExpression = (elementName: string, property: string, value: string) => {
		return {
			type: "AssignmentExpression",
			operator: "=",
			left: {
				type: "MemberExpression",
				computed: false,
				optional: false,
				object: {
					type: "MemberExpression",
					computed: false,
					optional: false,
					object: {
						type: "Identifier",
						name: elementName,
					} satisfies ESTree.Identifier,
					property: {
						type: "Identifier",
						name: "dataset",
					} satisfies ESTree.Identifier,
				} satisfies ESTree.MemberExpression,
				property: {
					type: "Identifier",
					name: property,
				} satisfies ESTree.Identifier,
			} satisfies ESTree.MemberExpression,
			right: {
				type: "Literal",
				value: value,
			} satisfies ESTree.SimpleLiteral,
		} satisfies ESTree.AssignmentExpression;
	};

	// #region VISIT CLASS BODY
	const visitClassBody = (node: ESTree.ClassBody) => {
		console.warn("TODO: implement classes");
		// for (const property of node.body) {
		// }
	};
	// #endregion

	const createTempElementVariableDeclarations = () => {
		const declarators: ESTree.VariableDeclarator[] = [];
		for (let i = 1; i <= elementScopesIdStack.at(-1).elementCount; ++i) {
			declarators.push({
				type: "VariableDeclarator",
				id: {
					type: "Identifier",
					name: `__winzig__tempElement_${elementScopesIdStack.at(-1).id}_${i}`,
				} satisfies ESTree.Identifier,
				init: null,
			} satisfies ESTree.VariableDeclarator);
		}
		return {
			type: "VariableDeclaration",
			kind: "var",
			declarations: declarators,
		} satisfies ESTree.VariableDeclaration;
	};

	// #region VISIT FUNCTION BODY
	const visitFunction = (node: ESTree.ArrowFunctionExpression | ESTree.FunctionExpression | ESTree.FunctionDeclaration) => {
		dependencyStack.push(null);
		elementScopesIdStack.push({
			id: getUniqueFunctionId(),
			elementCount: 0,
		});
		let modifiedNode: ESTree.BlockStatement | undefined;
		if (node.body.type === "BlockStatement") {
			visitStatementOrProgram(node.body);
		} else {
			if (tempExpression = visitExpression(node.body)) node.body = tempExpression;
		}
		if (elementScopesIdStack.at(-1).elementCount > 0) {
			if (node.body.type !== "BlockStatement") {
				(node as ESTree.ArrowFunctionExpression).expression = false;
				node.body = {
					type: "BlockStatement",
					body: [
						{
							type: "ReturnStatement",
							argument: node.body,
						} satisfies ESTree.ReturnStatement,
					],
				} satisfies ESTree.BlockStatement;
			}

			node.body.body.unshift(createTempElementVariableDeclarations());
		}
		elementScopesIdStack.pop();
		dependencyStack.pop();
		return modifiedNode;
	};
	// #endregion

	const isReactivePrimitive = (node: ESTree.Expression) => {
		return (
			node.type === "Identifier" && reactiveIdentifierRegExp.test(node.name)
			|| node.type === "MemberExpression" && !node.computed && reactiveIdentifierRegExp.test((node.property as ESTree.Identifier).name)
		);
	};


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
				visitFunction(node);
				// 	node.expression = false;
				// 	node.body = tempStatement;
				// }
				break;
			}
			// #endregion
			// #region FunctionExpression
			case "FunctionExpression": {
				visitFunction(node);
				// visitStatementOrProgram(node.body as ESTree.BlockStatement);
				break;
			}
			// #endregion
			// #region AssignmentExpression
			case "AssignmentExpression": {
				if (tempExpression = visitExpression(node.right)) node.right = tempExpression;

				if (
					node.left.type === "Identifier"
					&& reactiveIdentifierRegExp.test(node.left.name)
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
						&& reactiveIdentifierRegExp.test(node.left.object.name)
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
				if (tempExpression = visitExpression(node.argument)) node.argument = tempExpression;
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
					// let arg: ESTree.Expression | ESTree.SpreadElement;
					// let cssId: number;

					// let firstArg = node.arguments[0] as ESTree.Expression;
					let [firstArg, paramsArg, ...childArgs] = node.arguments as [ESTree.Expression, ESTree.Expression, ...(ESTree.Expression | ESTree.SpreadElement)[]];
					if (firstArg.type === "Identifier" && firstArg.name === "__winzig__Fragment") {
						firstArg = {
							type: "Literal",
							value: "wz-frag",
							loc: firstArg.loc,
						} satisfies ESTree.SimpleLiteral;
					}
					const isBuiltinElement = firstArg.type === "Literal";
					const isBody = isBuiltinElement && (firstArg as ESTree.SimpleLiteral).value === "body";
					const isHead = isBuiltinElement && (firstArg as ESTree.SimpleLiteral).value === "head";
					const isDocumentElement = isBuiltinElement && (firstArg as ESTree.SimpleLiteral).value === "html";

					let expressions: ESTree.Expression[] = [];
					let componentProps: (ESTree.Property | ESTree.SpreadElement)[] = []; // only for when element is not a builtin element
					let elementModificationExpressions: ESTree.Expression[] = [];
					let childExpressions: (ESTree.Expression | ESTree.SpreadElement)[] = [];

					if (isHead) {
						elementScopesIdStack.push({
							id: getUniqueFunctionId(),
							elementCount: 0,
						});
					}

					const tempElementVarName = `__winzig__tempElement_${elementScopesIdStack.at(-1).id}_${++elementScopesIdStack.at(-1).elementCount}`;

					let tempElementVarInit: ESTree.Expression;

					{
						if (paramsArg.type === "ObjectExpression") {
							for (const property of paramsArg.properties) {
								if (property.type === "Property") {
									if (property.key.type === "Literal" && (property.key.value as string).startsWith("on:")) {
										if (tempExpression = visitExpression(property.value)) property.value = tempExpression;
										const [eventName, ...modifiers] = (property.key.value as string).slice(3).split("_");
										elementModificationExpressions.push(
											{
												type: "CallExpression",
												optional: false,
												callee: {
													type: "MemberExpression",
													computed: false,
													optional: false,
													object: {
														type: "Identifier",
														name: tempElementVarName,
													} satisfies ESTree.Identifier,
													property: {
														type: "Identifier",
														name: "addEventListener",
													} satisfies ESTree.Identifier,
												} satisfies ESTree.MemberExpression,
												arguments: [
													{
														type: "Literal",
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
																					// What, code *shouldn't* be indented 21 levels deep, you say??
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
											} satisfies ESTree.CallExpression,
										);
									} else if (property.key.type === "Identifier") {
										const couldBeReactive = isBuiltinElement || isReactivePrimitive(property.key as ESTree.Expression);
										let value = property.value as ESTree.Expression;
										let isReactive = false;
										if (couldBeReactive) {
											dependencyStack.push(new Set());
											if (tempExpression = visitExpression(value, !isBuiltinElement)) value = tempExpression;
											if (isBuiltinElement) {
												if (isReactivePrimitive(value) || dependencyStack.at(-1).size) {
													isReactive = true;
												}
											} else if (dependencyStack.at(-1).size) {
												value = transformToLiveExpression(value, [...dependencyStack.at(-1)]);
											}
										} else {
											if (tempExpression = visitExpression(value)) value = tempExpression;
										}
										if (isBuiltinElement) {
											const assignment = {
												type: "AssignmentExpression",
												operator: "=",
												left: {
													type: "MemberExpression",
													computed: false,
													optional: false,
													object: {
														type: "Identifier",
														name: tempElementVarName,
													} satisfies ESTree.Identifier,
													property: property.key
												} satisfies ESTree.MemberExpression,
												right: value,
											} satisfies ESTree.AssignmentExpression;
											elementModificationExpressions.push(
												isReactive
													? createAddListenersExpression(
														{
															type: "ArrowFunctionExpression",
															expression: true,
															params: [] as any[],
															body: assignment,
														} satisfies ESTree.ArrowFunctionExpression,
														true,
														dependencyStack.at(-1),
													)
													: assignment
											);
										} else {
											property.value = value;
											componentProps.push(property);
										}
										if (couldBeReactive) {
											dependencyStack.pop();
										}
									} else {
										throw new Error(`JSX property is neither an identifier nor an "on:..." literal.`);
									}
								}
							}
						}
					}

					if (childArgs.length) {
						const lastArg = childArgs.at(-1);
						if (
							(isBuiltinElement)
							&& lastArg.type === "TaggedTemplateExpression"
							&& lastArg.tag.type === "Identifier"
							&& cssRegExp.test(lastArg.tag.name)
						) {
							if (lastArg.quasi.expressions.length > 0) throw new Error("CSS dynamic template string insertions not supported.");
							const cssId = getUniqueCSSId();

							let cssString = lastArg.quasi.quasis[0].value.cooked.trim();
							const [firstLine, ...otherLines] = cssString.split("\n");
							const leadingWhitespace = otherLines.at(-1)?.match(/^(\s*)/)[0].length ?? 0;
							cssString = [firstLine, ...otherLines.map(line => line.slice(leadingWhitespace - 1))].join("\n");
							cssSnippets.push(
								noCSSScopeRules
									? `\n[data-wz-id="${cssId.toString(36)}"] {\n\t${minify
										// Chromium v128 had a weird bug where nested selectors
										// didn't get parsed if they start with a tag name and
										// are immediately preceded by a closing brace (i.e. with no whitespace in between).
										// This hack adds an empty `z{}` rule before those selectors
										// that then gets replaced by whitespace afterwards.
										? cssString.replaceAll(
											/}\n(?:[ \t]*\n)*(?<indentation>[ \t]+)(?<firstChar>\w)/g,
											"}\n\n$<indentation>z{}\n$<indentation>$<firstChar>",
										)
										: cssString
									}\n}\n`
									: `\n@scope ([data-wz-id="${cssId.toString(36)}"]) to ([data-wz-new-scope]) {\n\t${cssString}\n}\n`
							);
							elementModificationExpressions.push(
								createDatasetAssignmentExpression(tempElementVarName, "wzId", cssId.toString(36))
							);
							childArgs.pop();
						}
					}

					for (let i = 0; i < childArgs.length; ++i) {
						let arg = childArgs[i];
						if (arg.type === "SpreadElement") {
							if (
								arg.argument.type === "CallExpression"
								&& arg.argument.callee.type === "MemberExpression"
								&& arg.argument.callee.property.type === "Identifier"
								&& arg.argument.callee.property.name === "map"
								&& arg.argument.callee.object.type === "Identifier"
								&& reactiveIdentifierRegExp.test(arg.argument.callee.object.name)
							) {
								arg.argument.callee.property.name = "m";
								visitExpression(arg.argument.arguments[0]);
							} else {
								if (tempExpression = visitExpression(arg.argument)) arg.argument = tempExpression;
							}
						} else {
							dependencyStack.push(new Set());
							let isReactive = isReactivePrimitive(arg);
							if (tempExpression = visitExpression(arg, true)) arg = tempExpression;
							if (dependencyStack.at(-1).size) {
								arg = transformToLiveExpression(arg, [...dependencyStack.at(-1)]);
								isReactive = true;
							}
							if (isReactive) {
								arg = {
									type: "CallExpression",
									callee: {
										type: "Identifier",
										name: "__winzig__createLiveTextNode"
									} satisfies ESTree.Identifier,
									optional: false,
									arguments: [arg],
								} satisfies ESTree.CallExpression;
							}
							dependencyStack.pop();
						}
						childExpressions.push(arg);
					}

					{
						if (isBuiltinElement) {
							let elementName = (firstArg as ESTree.SimpleLiteral).value as string;
							const isSVGElement = svgElements.has(elementName);
							if (isSVGElement && elementName.startsWith("svg:")) elementName = elementName.slice(4);
							if (isDocumentElement || isBody || isHead) {
								tempElementVarInit = {
									type: "MemberExpression",
									computed: false,
									optional: false,
									object: {
										type: "Identifier",
										name: "document",
									} satisfies ESTree.Identifier,
									property: {
										type: "Identifier",
										name: tagNameToDocumentPropertyMappings[elementName],
									} satisfies ESTree.Identifier,
								} satisfies ESTree.MemberExpression;
							} else {
								tempElementVarInit = {
									type: "CallExpression",
									callee: {
										type: "Identifier",
										name: isSVGElement
											? "__winzig__createSVGElement"
											: mathMLElements.has(elementName)
												? "__winzig__createMathMLElement"
												: "__winzig__createHTMLElement",
									} satisfies ESTree.Identifier,
									optional: false,
									arguments: [
										{
											type: "Literal",
											value: elementName,
										} satisfies ESTree.SimpleLiteral,
									],
								} satisfies ESTree.CallExpression;
							}
						} else {
							tempElementVarInit = {
								type: "CallExpression",
								callee: firstArg as ESTree.Expression,
								optional: false,
								arguments: [
									{
										type: "ObjectExpression",
										properties: componentProps,
									} satisfies ESTree.ObjectExpression,
									...(childExpressions.length
										? [
											{
												type: "ArrayExpression",
												elements: childExpressions,
											} satisfies ESTree.ArrayExpression
										]
										: []
									)
								],
							} satisfies ESTree.CallExpression;
						}

						expressions.push({
							type: "AssignmentExpression",
							operator: "=",
							left: {
								type: "Identifier",
								name: tempElementVarName,
							} satisfies ESTree.Identifier,
							right: tempElementVarInit,
						} satisfies ESTree.AssignmentExpression);
					}

					expressions.push(...elementModificationExpressions);

					if (isBuiltinElement) {
						if (isDocumentElement) {
							expressions.push(childExpressions[1] as ESTree.Expression); // <body>
						} else if (childExpressions.length) {
							expressions.push({
								type: "CallExpression",
								optional: false,
								callee: {
									type: "MemberExpression",
									computed: false,
									optional: false,
									object: {
										type: "Identifier",
										name: tempElementVarName,
									} satisfies ESTree.Identifier,
									property: {
										type: "Identifier",
										name: isBody ? "replaceChildren" : "append",
									} satisfies ESTree.Identifier,
								} satisfies ESTree.MemberExpression,
								arguments: childExpressions,
							} satisfies ESTree.CallExpression);
						}
					} else {
						expressions.push(createDatasetAssignmentExpression(tempElementVarName, "wzNewScope", ""));
					}

					if (!isDocumentElement && !isHead && !isBody) {
						expressions.push({
							type: "Identifier",
							name: tempElementVarName,
						} satisfies ESTree.Identifier);
					}

					const returnSequenceExpression = {
						type: "SequenceExpression",
						expressions,
					} satisfies ESTree.SequenceExpression;

					if (isHead) {
						headStatements.push(
							createTempElementVariableDeclarations(),
							{
								type: "ExpressionStatement",
								expression: returnSequenceExpression,
							} satisfies ESTree.ExpressionStatement,
						);
						elementScopesIdStack.pop();
						return null;
					}

					return returnSequenceExpression;
				} else {
					if (
						node.callee.type === "MemberExpression"
						&& node.callee.object.type === "Identifier"
						&& reactiveIdentifierRegExp.test(node.callee.object.name)
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
				if (!leaveLiveVars && reactiveIdentifierRegExp.test(node.name)) {
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
				if (tempExpression = visitExpression(node.source as ESTree.Expression)) node.source = tempExpression;
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

				if (node.computed) {
					if (tempExpression = visitExpression(node.property as ESTree.Expression)) node.property = tempExpression;
				} else if (
					!leaveLiveVars
					&& node.property.type === "Identifier"
					&& reactiveIdentifierRegExp.test(node.property.name)
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
				}
				break;
			}
			// #endregion
			// #region MetaProperty
			case "MetaProperty": {
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
						if (prop.key.type === "Identifier" && reactiveIdentifierRegExp.test((prop.key as ESTree.Identifier).name)) {
							prop.value = wrapIntoLiveVariableOrArray(visitExpression(prop.value as ESTree.Expression) ?? prop.value as ESTree.Expression);
						} else if (tempExpression = visitExpression(prop.value)) prop.value = tempExpression;
					}
				}
				break;
			}
			// #endregion
			// #region ObjectPattern
			case "ObjectPattern": {
				// TODO: Maybe handle edge cases like `let { a: a$ } = whatever()`? (Or throw warnings)
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
					&& reactiveIdentifierRegExp.test(node.argument.name)
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
						&& reactiveIdentifierRegExp.test(node.argument.object.name)
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
				for (let i = 0; i < node.body.length; ++i) {
					if (tempStatement = visitStatementOrProgram(node.body[i])) {
						node.body[i] = tempStatement;
					} else if (tempStatement === null) {
						node.body.splice(i, 1);
						--i;
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
				break;
			}
			// #endregion
			// #region ExportDefaultDeclaration
			case "ExportDefaultDeclaration": {
				break;
			}
			// #endregion
			// #region ExportNamedDeclaration
			case "ExportNamedDeclaration": {
				// TODO: Handle edge cases like `export { $a as a }`? (Or throw warnings)
				break;
			}
			// #endregion
			// #region ExpressionStatement
			case "ExpressionStatement": {
				if (tempExpression = visitExpression(node.expression)) node.expression = tempExpression;
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
				visitFunction(node);
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
								expression: createAddListenersExpression(
									{
										type: "ArrowFunctionExpression",
										body: node.body.expression.body,
										expression: node.body.expression.expression,
										params: [] as any[],
									} satisfies ESTree.ArrowFunctionExpression,
									false,
									dependencyStack.at(-1),
								),
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
								type: "ExpressionStatement",
								expression: createAddListenersExpression(
									{
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
									true,
									dependencyStack.at(-1),
								),
							} satisfies ESTree.ExpressionStatement;
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
						if (declarator.id.type === "Identifier" && reactiveIdentifierRegExp.test(declarator.id.name)) {
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
								declarator.init = wrapIntoLiveVariableOrArray(
									visitExpression(declarator.init)
									?? declarator.init
									?? {
										type: "Identifier",
										name: "undefined",
									} satisfies ESTree.Identifier
								);
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
					if (tempExpression = visitExpression(declarator.init)) declarator.init = tempExpression;
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

	if (elementScopesIdStack.at(-1).elementCount > 0) {
		ast.body.splice(1, 0, createTempElementVariableDeclarations());
	}

	elementScopesIdStack.pop();

	if (headStatements.length) ast.body.push(
		{
			type: "ExpressionStatement",
			expression: {
				type: "Literal",
				value: "__$WZ_SEPARATOR__",
			} satisfies ESTree.SimpleLiteral,
		} satisfies ESTree.ExpressionStatement,
		...headStatements,
		// {
		// 	type: "ExpressionStatement",
		// 	expression: {
		// 		type: "CallExpression",
		// 		optional: false,
		// 		callee: {
		// 			type: "MemberExpression",
		// 			computed: false,
		// 			optional: true,
		// 			object: {
		// 				type: "MemberExpression",
		// 				computed: false,
		// 				optional: false,
		// 				object: {
		// 					type: "Identifier",
		// 					name: "globalThis",
		// 				} satisfies ESTree.Identifier,
		// 				property: {
		// 					type: "Identifier",
		// 					name: "__winzig__",
		// 				} satisfies ESTree.Identifier,
		// 			} satisfies ESTree.MemberExpression,
		// 			property: {
		// 				type: "Identifier",
		// 				name: "finish",
		// 			} satisfies ESTree.Identifier,
		// 		} satisfies ESTree.MemberExpression,
		// 		arguments: [],
		// 	} satisfies ESTree.CallExpression,
		// } satisfies ESTree.ExpressionStatement,
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

	if (debug) FSSync.writeFileSync(`./ast-${info.name}-after.json`, JSON.stringify(ast, (key, value) => typeof value === "bigint" ? Number(value) : value, "\t"));

	return {
		cssSnippets,
	};
};

export const init = async (options: { noCSSScopeRules: boolean, minify: boolean, debug: boolean; }) => {
	getUniqueCSSId.reset();
	getUniqueFunctionId.reset();
	noCSSScopeRules = options.noCSSScopeRules;
	minify = options.minify;
	debug = options.debug;
	if (debug) {
		FSSync ??= await import("node:fs");
	}
};
