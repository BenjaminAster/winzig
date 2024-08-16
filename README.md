
# Winzig

Yet another reactive JavaScript (+CSS) frontend framework—but different.

> [!NOTE]
> 🚧 This project is still very much under construction. Apart from a few select examples, what you are trying to build will most definitely not work yet. Also, note that winzig apps currently do not work in Firefox due to it not supporting the CSS [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) rule. To test your winzig app in Firefox, please enable `layout.css.at-scope.enabled` in `about:config`.

Winzig tries to keep things minimalistic while still being powerful and extensible. It tries to combine the nice DX of the compiled nature of frameworks like Svelte with the JSX/TSX syntax and flexibility of frameworks like React. For example, here is a simple counter app implemented with winzig. Note that this one file (index.tsx), is (apart from a recommended `tsconfig.json` file) the only file that you need to get started.

```tsx
// src/index.tsx

import { css } from "winzig";

let count$ = 0; // the "$" after the variable name makes it reactive

<html lang="en">
	<head>
		<title>Winzig Counter App</title>
	</head>
	<body>
		<h1>Winzig Counter</h1>
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
```

## Documentation

TODO: write documentation. Meanwhile, see the [examples](./examples/).

## CLI options
- `-w`, `--watch`: Watch for file changes in the `src` folder and rebuild the project.
- `-o`, `--output`: The path to the root folder where the project is saved to. (default: `./`)
- `--appfiles`: The path to the folder where the compiled JavaScript files will be saved. (default: `./appfiles/`)
- `--pretty`: Do not minify JavaScript output files.
- `--live-reload`: Enable live reloading. Requires `--watch` to be enabled.
- `-d`, `--dev`: Shortcut for `--watch`, `--pretty`, `--no-prerender` and `--live-reload`.
- `--no-prerender`: Disable prerendering
- `--keep-prerender-folder`: Keep winzig's internal `.winzig-prerender` folder after building.
