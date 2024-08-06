
import { toDos } from "./imported/test.ts";

import { css } from "winzig";

{
	let a = 1;
	a *= 10;
	console.log(a);
}
{
	let a = 1;
	a *= 10;
	console.log(a);
}
{
	let a = 1;
	a *= 10;
	console.log(a);
}

const ToDo = () => {
	const toDoList = structuredClone(toDos);
	let fg = "light-dark(maroon, khaki)";
	let bg = "#80f2";
	let input: HTMLInputElement;
	const UL = <ul id="hi"></ul>;

	// console.log(new Variable(1), new _Variable(2));

	const rerender = () => {
		UL.innerHTML = "";
		UL.append(...toDoList.map((todo, i) =>
			<li>
				{todo} <button on:click={function () { toDoList.splice(i, 1); rerender(); }}>✗</button>
				{css`
					& {
						color: ${fg};
						background-color: ${bg};
						margin-block-end: .3rem;
					}

					button {
						padding: .1em .5em;
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
			{" "}<button on:click={() => --count$} >decrease counter</button>
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

document.body.append(
	<main>
		<h1>Winzig ToDo App</h1>

		<div>This is a <code>&lt;div&gt;</code> outside of <code>&lt;ToDo /&gt;</code>.</div>
		<br />

		<ToDo />

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

<html>
	<head>
		<title>hello world</title>
	</head>
	<body>
		<h1>testtest {console.log(2)} 6969</h1>
	</body>
</html>

{
	console.log(4);
}
