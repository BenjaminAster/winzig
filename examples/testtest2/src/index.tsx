
import { css, type Config as WinzigConfig } from "winzig";

// let a$ = 5;
// using b$ = a$ * 2;
// console.log(b$); // logs 10
// a$ = 20;
// console.log(b$); // logs 40

// let count$ = 0; // the "$" suffix makes variables reactive

// let wordCount$ = 0;

winzigConfig: ({
	appfiles: "appfiles",
	output: "../",
	css: "./global.css",
}) satisfies WinzigConfig;

const div = <div></div>;

const a = () => <svg:a></svg:a>;

const Math = function () {
	return <math></math>;
};

// declare var $: <T>(v: T) => T;

// // https://www.youtube.com/watch?v=4TdOEe6liSE&t=1h00m51s
// {
// 	const createSignal = (init: number) => {
// 		let a$ = init;
// 		const setToDoubled = (v: number) => a$ = v*2;
// 		using b$ = a$ * 2;
// 		return [$(b$), setToDoubled] as const;
// 	};

// 	let [c$, setHalf] = createSignal(3);
// 	console.log(c$) // 3
// 	setHalf(5);
// 	console.log(c$) // 10
// }

function Fraction({ numerator$, denominator$ }: { numerator$: number, denominator$: number; }) {
	return <math>
		<mfrac>
			<mn>{numerator$}</mn>
			<mn>{denominator$}</mn>
		</mfrac>
		<mo>=</mo>
		<mn>{numerator$ / denominator$}</mn>
	</math>;
};

console.log(div.namespaceURI, a().namespaceURI, Math().namespaceURI);

// ;
// <html></html>;
// <div></div>;
// <math></math>;
// <mfrac></mfrac>;
// <title></title>;
// <svg:title></svg:title>;
// <a></a>;
// <svg:a></svg:a>;
// <foreignObject></foreignObject>;
// <feBlend></feBlend>;

let count$ = 0;
using hexCount$ = count$.toString(16).toUpperCase();

setInterval(() => ++count$, 500);

let a$ = 10;
let b$ = 2;

{
	const htmlAnchor = <a></a>;
	console.log(htmlAnchor.namespaceURI); // http://www.w3.org/1999/xhtml

	const svgAnchor = <svg:a></svg:a>;
	console.log(svgAnchor.namespaceURI); // http://www.w3.org/2000/svg
}

;
<html lang="en">
	<head>
		<title>Winzig Test 2</title>
	</head>
	<body className={`count-${count$}`}>
		<p>Hello <code id="testtest">world</code>! (2 * {count$} = {count$ * 2}) <span ariaLabel={hexCount$}>0x{hexCount$}</span></p>
		<button on:click={() => count$ += 10}>+</button>
		<svg>
			<image></image>
			<text>testtest</text>
			<svg:a></svg:a>
			<foreignObject>
				<div>hello</div>
			</foreignObject>
		</svg>
		<div>
			<Fraction numerator$={a$} denominator$={b$} />
			<div>
				<button on:click={() => ++a$}>increase numerator</button> { }
				<button on:click={() => --a$}>decrease numerator</button>
				<br />
				<button on:click={() => ++b$}>increase denominator</button> { }
				<button on:click={() => --b$}>decrease denominator</button> { }
			</div>
			{css`
				& {
					border: 1px solid red;
					padding: 1rem;
				}

				button {
					color: light-dark(blue, yellow);
				}
			`}
		</div>
	</body>
</html>;
