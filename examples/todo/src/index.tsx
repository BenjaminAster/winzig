
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
				{todo} <button on:click={() => { toDoList.splice(i, 1); rerender(); }}>✗</button>
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

	let count$ = 3;
	using doubleCount$ = count$ * 2; // TODO: implement live expressions

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
			New ToDo item: {""}
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

<html lang="en">
	<head>
		<title>Winzig ToDo App</title>
	</head>
	<body>
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

			asdfasdf {navigator.userAgent}
			<br />
			Time: {new Date().toLocaleString("de-DE")}

			<ul>
				<li>1</li>
				<>
					<li>2</li>
					<li>3</li>
				</>
				<li>4</li>
			</ul>

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
	</body>
</html>;
