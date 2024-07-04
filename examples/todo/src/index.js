
console.info(123);

export const a = (/** @type {string} */ message) => console.log(message);

export const factorial = (n) => {
	let result = 1;
	for (let i = 1; i <= n; i++) {
		result *= i;
	}
	return result;
};

export const sum = (a, b) => a + b;

export const subtract = (a, b) => a - b;

export const multiply = (a, b) => a * b;

export const divide = (a, b) => a / b;

export const modulo = (a, b) => a % b;

export const pow = (a, b) => a ** b;

export const sqrt = (a) => Math.sqrt(a);

export const fibonacci = (n) => {
	let a = 0;
	let b = 1;
	for (let i = 0; i < n; i++) {
		[a, b] = [b, a + b];
	}
	return a;
};

console.log("asdfasdf");
