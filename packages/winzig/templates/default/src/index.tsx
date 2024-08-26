
import { css, Config as WinzigConfig } from "winzig";

winzigConfig: ({
	appfiles: "appfiles",
	output: "../",
	css: "./global.css",
}) satisfies WinzigConfig;

let count$ = 0;

<html lang="en">
	<head>
		<title>Winzig Code Template</title>
	</head>
	<body>
		<h1>Winzig Code Template</h1>
		Count: {count$}<br />
		<button on:click={() => ++count$}>+</button> { }
		<button on:click={() => --count$}>-</button>

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
