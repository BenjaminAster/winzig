
export const jsx = (...args) => {
	console.log(...args);
	return [...args];
};

export const jsxs = jsx;

console.log("hello from winzig/src/jsx-runtime/index.ts");
