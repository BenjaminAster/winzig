
import { toDos } from "./imported/test.tsx";

import { css, Variable } from "winzig";

const ToDo = () => {
	const toDoList = structuredClone(toDos);
	let fg = "light-dark(maroon, khaki)";
	let bg = "#80f2";
	let input: HTMLInputElement;
	const UL = <ul id="hi"></ul>;
	const rerender = () => {
		UL.innerHTML = "";
		UL.append(...toDos.map((todo, i) =>
			<li>
				{todo} <button on:click={() => { toDos.splice(i, 1); rerender(); }}>✗</button>
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

	// In the future, this statement should look like this: `let count$ = 0;`
	let count = new Variable(0);

	return <>
		<div>
			Count: {count}
			{" "}<button on:click={() => --count._}>decrease counter</button>
			{" "}<button on:click={() => ++count._}>increase counter</button>
		</div>

		<UL />

		<form on:submit_preventDefault={function () {
			toDos.push(input.value);
			rerender();
			input.value = "";
		}}>
			New ToDo item: {" "}
			{input = <input type="text" ariaLabel="new ToDo item" />} {" "}
			<button>✗</button>

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

