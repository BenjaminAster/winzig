
import { css } from "winzig";

let count$ = 0;

import.meta.resolve;

<html lang="en">
	<head>
		<title>Winzig Counter App</title>
		<meta name="description" content="A simple counter app implemented with winzig." />
	</head>
	<body>
		<h1>Winzig counter</h1>
		Count: {count$} { }
		<button on:click={() => ++count$}>+</button> { }
		<button on:click={() => --count$}>-</button>

		{css`
			& {
				padding-inline: 1rem;
			}

			button {
				all: unset;
				display: inline-block;
				cursor: pointer;
				background-color: #8885;
				padding: .1em .6em;
				border-radius: .2em;
				font-family: monospace;
				font-size: 1.2em;
			}
		`}
	</body>
</html>;
