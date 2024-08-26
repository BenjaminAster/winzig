
import { css, type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	appfiles: "appfiles",
	output: "../",
	css: "./global.css",
}) satisfies WinzigConfig;

let count$ = 5;
using doubleCount$ = count$ * 2;
$: console.log("%c" + count$, "color: red;"); // runs once and on every update of count$
$: () => console.log("%c" + count$, "color: light-dark(blue, dodgerblue);"); // runs on every update of count$, but not at the beginning

const SomethingSomething = () => {
	return <div>
		<div>before slot</div>
		<slot />
		<div>after slot</div>
	</div>;
};

let Input = <input type="text" value="hello" />;

// console.log(Input, Input.value);

<html lang="en">
	<head>
		<title>winzig showcase</title>
	</head>
	<body>
		Count: {count$}<br />
		Double count: {doubleCount$}<br />
		Triple count: {count$ * 3}<br />
		<button className={`count-${count$.toString(16)}`} on:click={() => ++count$}>increase count</button>
		<div>some div</div>
		<hr />
		<SomethingSomething>
			<div>child 1</div>
			<div>child 2</div>
		</SomethingSomething>
		<hr />
		<SomethingSomething />
		<hr />
		<Input />
		{css`
			div {
				color: light-dark(green, lightgreen);
			}
		`}
	</body>;
</html>;

console.log(1);
console.log(2);
console.log(3);
console.log(4);
console.log(5);
console.log(6);
console.log(7);
