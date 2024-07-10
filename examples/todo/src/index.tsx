
/*
To compile this project, run this command:
winzig
*/

import { c } from "./imported/test.tsx";

import { css } from "winzig";

c();

const ToDo = () => {
	let todos = ["hi", "ho", "ha"];
	let fg = "khaki";
	let bg = "navy";
	const UL = <ul></ul>;
	const rerender = () => {
		UL.innerHTML = "";
		UL.append(...todos.map((todo, i) =>
			<li>
				{todo} <button on:click={() => { todos.splice(i, 1); rerender(); }}>&cross;</button>
				{css`
					& {
						color: ${fg};
						background-color: ${bg};
					}
				`}
			</li>
		));
	};
	rerender();

	return <>
		<UL />

		<form on:submit_preventDefault={function () {
			todos.push(this.elements.todo.value);
			rerender();
			this.elements.todo.value = "";
		}}>
			New ToDo item: {" "}
			<input type="text" name="todo" /> {" "}
			<button>&check; {8}</button>

			{css`
				& {
					font-style: italic;
				}

				button {
					border: 4px solid green;
					background: #8886;
				}
			`}
		</form>

		{css`
			& {
				color: red;
			}
		`}
	</>;
};

document.body.append(<ToDo />);

