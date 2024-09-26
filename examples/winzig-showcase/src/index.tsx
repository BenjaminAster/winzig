
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

let myArray$ = ["hello", "world"];

const SomethingSomething = (_: any, children: any[] = []) => {
	return <div>
		<div>before inserted children</div>
		{...children}
		<div>after inserted children</div>
	</div>;
};

let input = <input type="text" value="hello" />;

console.log(input.value);

const consonants = "bcdfghjklmnpqrstvwxyz";
const vocals = "aeiou";

;
<html lang="en">
	<head>
		<title>winzig showcase</title>
	</head>
	<body>
		Count: {count$}<br />
		Double count: {doubleCount$}<br />
		Triple count: {count$ * 3}<br />
		<button className={`count-${count$.toString(16)}`} on:click={() => ++count$}>increase count</button> { }
		<button className={`count-${count$.toString(32)}`} on:click={() => --count$}>decrease count</button>
		<div>some div</div>
		<div>
			<button on:click={() => myArray$.push(
				Array.from({ length: 4 },
					() => consonants[Math.random() * consonants.length | 0]
						+ vocals[Math.random() * vocals.length | 0]).join("")
			)}>add element to array</button>
		</div>
		<hr />
		<SomethingSomething>
			<div>child 1</div>
			<div>child 2</div>
		</SomethingSomething>
		<hr />
		<SomethingSomething />
		<hr />
		<SomethingSomething>
			{...myArray$.map((item, index$) => <span>[{item}] </span>)}
		</SomethingSomething>
		<hr />
		<SomethingSomething>
			{...myArray$.map((item, index$) => <div>
				array item {item} (index {index$}) { }
				<button on:click={() => myArray$.splice(index$, 1)}>X</button>
			</div>)}
		</SomethingSomething>
		<hr />
		{input}
		{css`
			div {
				color: light-dark(green, lightgreen);
			}
		`}
	</body>;
</html>;
