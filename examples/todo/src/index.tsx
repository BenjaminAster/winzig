
import { toDos } from "./imported/test.ts";

import { css } from "winzig";

const ToDo = () => {
	let toDoList$ = structuredClone(toDos);
	let input: HTMLInputElement;

	let count$ = 3;
	using doubleCount$ = count$ * 2;

	return <>
		<div>
			Count: {count$}
			{" "}<button on:click={() => --count$}>decrease counter</button>
			{" "}<button on:click={() => ++count$}>increase counter</button>
			{" "}(Double count: {doubleCount$})
		</div>

		<ul>
			{...toDoList$.map((todo, i) =>
				<li>
					{todo} <button on:click={() => { toDoList$ = toDoList$.toSpliced(i, 1); }}>✗</button>
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
			)}
		</ul>

		<form on:submit_preventDefault={() => {
			toDoList$ = [...toDoList$, input.value];
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

const SomethingSomething = () => {
	return <div>
		<div>before slot</div>
		<slot />
		<div>after slot</div>
	</div>;
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

			{...[
				<div>A</div>,
				<div>B</div>,
				<div>C</div>,
			]}

			<ToDo />

			asdfasdf {navigator.userAgent}
			<br />
			{navigator.appCodeName}
			<br />
			{navigator.appName}
			<br />
			{navigator.appVersion}
			<br />
			{navigator.cookieEnabled}
			<br />
			{navigator.language}
			<br />
			{navigator.languages.toString()}
			<br />
			{navigator.vendor}
			<br />
			{window.screen}
			<br />
			{window.screen.height}
			<br />
			{window.screen.width}
			<br />
			{window.innerHeight}
			<br />
			{window.innerWidth}
			<br />
			{document.compatMode}
			<br />
			{JSON.stringify(document.body.getBoundingClientRect())}
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

			<SomethingSomething>
				<div>child 1</div>
				<div>child 2</div>
			</SomethingSomething>

			<SomethingSomething />

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
