
import { css } from "winzig";

let a$ = 5;
using b$ = a$ * 2;
console.log(b$); // logs 10
a$ = 20;
console.log(b$); // logs 40

let count$ = 0; // the "$" suffix makes variables reactive

let wordCount$ = 0;

<html lang="en">
	<head>
		<title>Winzig Counter</title>
	</head>
	<body>
		<button on:click={() => ++count$}>This button</button> { }
		has been clicked {count$} {count$ === 1 ? "time" : "times"}.

		{css`
			& {
				font-family: system-ui, sans-serif;
			}

			button {
				cursor: pointer;
			}
		`}
	</body>
</html>;
