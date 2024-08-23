
import { toDos } from "./imported/test.ts";

import { css, type GenericElement } from "winzig";

const ToDo = () => {
	let toDoList$ = structuredClone(toDos);
	let input: HTMLInputElement;

	return <>
		<div>This is a <code>&lt;div&gt;</code> inside of <code>&lt;ToDo /&gt;</code>.</div>
		<br />

		<form on:submit_preventDefault={() => {
			toDoList$ = [...toDoList$, input.value];
			input.value = "";
		}}>
			New ToDo item: { }
			{input = <input type="text" name="todo-item" ariaLabel="new ToDo item" /> as HTMLInputElement} { }
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

		<ul>
			{...toDoList$.map((todo, i) =>
				<li>
					{todo} <button on:click={() => { toDoList$ = toDoList$.toSpliced(i, 1); }}>✗</button>
					{css`
					`}
				</li>
			)}
		</ul>

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
	<body id="test">
		<main>
			<h1>{document.title}</h1>

			<div>This is a <code>&lt;div&gt;</code> outside of <code>&lt;ToDo /&gt;</code>.</div>

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
	</body>
</html>;
