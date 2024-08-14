
# Winzig

Yet another reactive JavaScript frontend framework—but different.

> [!NOTE]
> 🚧 This project is still very much under construction. Apart from a few select examples, what you are trying to build will most definitely not work yet. Also, note that Firefox is not yet supported. To test your winzig app in Firefox, enable `layout.css.at-scope.enabled` in `about:config`.

```tsx
// src/index.tsx

import { css } from "winzig";

let count$ = 0;

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

## CLI arguments
- `-w`, `--watch`: Watch for file changes in the `src` folder and rebuild the project.
- `-o`, `--output`: The path to the root folder where the project is saved to. (default: `./`)
- `--appfiles`: The path to the folder where the compiled JavaScript files will be saved. (default: `./appfiles/`)
- `--pretty`: Do not minify JavaScript output files.
- `--live-reload`: Enable live reloading. Requires `--watch` to be enabled.
- `-d`, `--dev`: Shortcut for `--watch`, `--pretty`, `--no-prerender` and `--live-reload`.
- `--no-prerender`: Disable prerendering
- `--keep-prerender-folder`: Keep winzig's internal `.winzig-prerender` folder after building.
