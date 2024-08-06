
import type * as ESTree from "estree";

import * as FS from "node:fs/promises";

let tempExpression: ESTree.Expression;

const visitExpression = (node: ESTree.Expression | ESTree.Pattern, reactiveScope: boolean = false) => {
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
			if (!reactiveScope && node.name.endsWith("$")) {
				return {
					type: "MemberExpression",
					computed: false,
					loc: node.loc,
					object: node,
					property: {
						type: "Identifier",
						name: "_",
						loc: node.loc,
					} as ESTree.Identifier,
				} as ESTree.MemberExpression;
			}
			break;
		}
		case "CallExpression": {
			let arg: ESTree.Expression | ESTree.SpreadElement;
			const reactive = (node.callee.type === "Identifier" && (node.callee.name === "__winzig__jsx" || node.callee.name === "__winzig__Fragment"));
			for (let i = 0; i < node.arguments.length; ++i) {
				arg = node.arguments[i];
				if (arg.type === "SpreadElement") continue;
				tempExpression = visitExpression(arg, reactive);
				if (tempExpression) node.arguments[i] = tempExpression;
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
		}
	}
};

const visitStatementOrProgram = (node: ESTree.Statement | ESTree.Program | ESTree.ModuleDeclaration) => {
	switch (node.type) {
		case "Program": case "BlockStatement": {
			for (const child of node.body) {
				visitStatementOrProgram(child);
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
									} as ESTree.Identifier,
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
		}
	}
};

export const modifyAST = (ast: ESTree.Program) => {
	// FS.writeFile("./ast.json", JSON.stringify(ast, null, "\t"));

	visitStatementOrProgram(ast);
	return ast;
};
