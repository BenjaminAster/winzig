
import { css, type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	appfiles: "appfiles",
	output: "../",
	css: "./global.css",
}) satisfies WinzigConfig;

let count$ = 0;
using tripleCount$ = count$ * 3;
$: console.log(`Count is now ${count$}.`);

<html lang="en">
	<head>
		<title>Winzig Counter App</title>
		<meta name="description" content="A simple counter app implemented with winzig." />
	</head>
	<body>
		<h1>Winzig Counter App</h1>
		Count: {count$}<br />
		Double count: {count$ * 2}<br />
		Triple count: {tripleCount$}<br />
		<button on:click={() => ++count$}>+</button> { }
		<button on:click={() => count$ = count$ - 1}>-</button>

		{css`
			& {
				padding-inline: 1rem;
			}

			button {
				font: bold 1.2em monospace;
				cursor: pointer;
			}
		`}
	</body>
</html>;
