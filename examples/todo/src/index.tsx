
import { toDos } from "./imported/test.ts";

import { css } from "winzig";

const ToDo = () => {
	const toDoList = structuredClone(toDos);
	let input: HTMLInputElement;
	const UL = <ul id="hi"></ul>;

	const rerender = () => {
		UL.innerHTML = "";
		UL.append(...toDoList.map((todo, i) =>
			<li>
				{todo} <button on:click={function () { toDoList.splice(i, 1); rerender(); }}>✗</button>
				{css`
					& {
						color: light-dark(maroon, khaki);
						background-color: #80f2;
						margin-block-end: .3rem;
					}

					button {
						padding: .1em .5em;

						&:hover {
							color: lime;
						}
					}
				`}
			</li>
		));
	};
	rerender();

	{
		console.log(1);
	}

	let count$ = 5;
	using doubleCount$ = count$ * 2; // TODO: implement live expressions
	console.log(count$);

	return <>
		<div>
			Count: {count$}
			{" "}<button on:click={() => --count$}>decrease counter</button>
			{" "}<button on:click={() => ++count$}>increase counter</button>
			{" "}(Double count: {doubleCount$})
		</div>

		<UL />

		<form on:submit_preventDefault={function () {
			toDoList.push(input.value);
			rerender();
			input.value = "";
		}}>
			New ToDo item: {" "}
			{input = <input type="text" name="todo-item" ariaLabel="new ToDo item" />} {" "}
			<button>✓</button>

			{css`
				& {
					font-style: italic;
				}

				button {
					border: 4px solid aqua;
					background: #8886;
				}
			`}
		</form>

		{css`
			& {
				font-family: monospace;
			}
		`}
	</>;
};

// const Test = (args: any) => {
// 	console.log(args);

// 	return <>
// 		<div>div 1</div>
// 		<div>div 2</div>
// 		<slot />
// 		<div>div 3 (after slot)</div>
// 	</>
// }

document.body.append(
	<main>
		<h1>Winzig ToDo App</h1>

		<div>This is a <code>&lt;div&gt;</code> outside of <code>&lt;ToDo /&gt;</code>.</div>
		<br />

		{[
			<div>A</div>,
			<div>B</div>,
			<div>C</div>,
		]}

		<ToDo />

		{/* <Test arg1={5}>
			<div>test child 1</div>
			<div>test child 2</div>
		</Test> */}

		{css`
			& {
				display: flow-root;
				padding-inline: 1rem;
			}

			div {
				border: 1px solid red;
				padding-inline: .3em;
			}

			code {
				background-color: #8884;
				padding-inline: .2em;
			}
		`}
	</main>
);

console.log(3);

// <html>
// 	<head>
// 		<title>hello world</title>
// 	</head>
// 	<body>
// 		<h1>testtest {console.log(2)} 6969</h1>
// 	</body>
// </html>

{
	console.log(4);
}
