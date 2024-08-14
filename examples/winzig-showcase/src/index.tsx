
import { css } from "winzig";

const FancyButton = () => {
	return <button on:click={() => alert("fancybutton clicked!")} type="button">
		<slot />

		{css`
			& {
				all: unset;
				cursor: pointer;
				outline: revert;
				background: linear-gradient(
					to right,
					light-dark(violet, darkViolet),
					light-dark(magenta, rebeccaPurple)
				);
				padding: .1em .5em;
				border-radius: .3em;
				color: white;
				font-weight: 600;
				letter-spacing: .05em;
			}
		`}
	</button>;
};

const Counter = ({ startValue = 0 }: { startValue?: number; }) => {
	let count$ = startValue;
	using doubleCount$ = count$ * 2;

	return <div>
		<div>Count: {count$}</div>
		<div>Double count: {doubleCount$}</div>
		<div>Triple count: {count$ * 3}</div>
		<div>
			<button on:click={() => ++count$}>+</button> { }
			<button on:click={() => --count$}>-</button>
		</div>
	</div>;
};

const name = "world";

let testtest$ = ["hel", "lo"];

<html lang="en">
	<head>
		<title>winzig showcase</title>
	</head>
	<body>
		<Counter />
		<Counter startValue={Date.now()} />

		<hr />

		<FancyButton>
			hello {name}
		</FancyButton>

		<div>
			{...testtest$.map(item => <div>item: {item}</div>)}
			<button on:click={() => testtest$ = [...testtest$, Math.random().toString()]}>add</button>
		</div>

	</body>;
	{
		css`
			body {
				padding: .8rem 1rem;
			}

			hr {
				block-size: 1px;
				border: none;
				background-color: #888;
			}
	`}
</html>;
