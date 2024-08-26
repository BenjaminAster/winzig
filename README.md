
# Winzig

Yet another reactive JavaScript (+CSS) frontend framework—but different.

> [!NOTE]
> 🚧 This project is still very much under construction. Apart from a few select examples, what you are trying to build will probably not work yet. Also, note that winzig apps currently do not work in Firefox due to it not supporting the CSS [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) rule. To still test your winzig apps in Firefox, please enable `layout.css.at-scope.enabled` in `about:config`.

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

## Getting started

To get started, install the winzig CLI globally:

```sh
npm install --global winzig@latest
```

Then, open an **empty** (!) directory and run

```sh
winzig create
```

This will create a basic minimalistic counter app in your current directory.

Optionally, run

```sh
pnpm install
```

(or `npm install` if you prefer using npm directly) to install the [`winzig-types`](https://www.npmjs.com/package/winzig-types) package for TypeScript type definitions.

To see a live reloading dev preview of your app, make sure you have a localhost HTTP server running, run

```sh
winzig --dev
```

and open the current directory in a browser.

To build your winzig app for production, run

```sh
winzig
```

## Documentation

> [!TIP]
> Also check out the [examples](./examples/).

The entry file of any winzig app must be called `index.tsx` and located in a subdirectory called `src`. It must contain a JSX `<html>` element at the root level of indentation with exactly two children; `<head>` and `<body>`. The following is an example of a very minimalistic but valid winzig app:

```tsx
// src/index.tsx

<html lang="en">
	<head>
		<title>My Awesome Winzig App</title>
	</head>
	<body>
		If you put a chameleon in a room full of mirrors, what color does it turn? 🦎
	</body>
</html>;
```

Putting anonymous JSX tags in your code like that might seem weird if you're used to other frameworks, but note that winzig is a compiler and therefore can do pretty much anything it wants.

If you postfix a variable name with a dollar sign (`$`), it gets compiled to a reactive "live variable":

```tsx
// src/index.tsx

let count$ = 0;

setInterval(() => count$++, 1000);

<html lang="en">
	<head>
		<title>Counter App</title>
	</head>
	<body>
		Count: {count$}
	</body>
</html>;
```

Components work just like you'd expect from other JSX-based frameworks:

```tsx
// src/index.tsx

const Counter = () => {
	let count$ = 0;

	setInterval(() => count$++, 1000);

	return <div>
		Count: {count$}
	</div>;
};

<html lang="en">
	<head>
		<title>My Awesome Winzig App</title>
	</head>
	<body>
		<Counter />
	</body>
</html>;
```

### Event listeners

Event listeners can be added with `on:`-prefixed attributes:

```tsx
const Counter = () => {
	let count$ = 0;

	return <div>
		Count: {count$}
		<br />
		<button on:click={() => ++count$}>increase</button> { }
		<button on:click={() => --count$}>decrease</button>
	</div>;
};
```

You can add a `_preventDefault` modifier to implicitly call `event.preventDefault()` before executing the callback function:

```tsx
<form on:submit_preventDefault={() => /* ... */}>
	<input type="text" />
	<button>Submit</button>
</form>
```

### CSS

Elements can be styled by inserting a `` {css`...`} `` call as the **last child** of an element:

```tsx
import { css } from "winzig";
const Counter = () => {
	let count$ = 0;

	return <div>
		Count: {count$}
		<br />
		<button on:click={() => ++count$}>increase</button> { }
		<button on:click={() => --count$}>decrease</button>
		{css`
			& {
				/* applies to the <div> element */
				padding: .3em .5em;
				border: 1px solid #9994;
				border-radius: .3em;
				margin: .5em;
			}

			button {
				/* applies to the two <button>s */
				border: none;
				background-color: light-dark(royalblue, cornflowerblue);
				color: light-dark(white, black);
				border-radius: .2em;
			}
		`}
	</div>;
};
```

**Technical info**: This `css` function does not actually exist; it's solely a way to put CSS into valid TSX syntax. `css` calls get removed and compiled into an external CSS file, with unique ids for the elements automatically being generated, so these CSS stylings have (almost) no runtime cost.

> [!TIP]
> In order to not manually type out the `` {css`...`} `` each time, you can add custom code snippets in most code editors.
> <details>
> <summary><strong><i>[Expand Me]</i></strong>: How to add a code snippet in Visual Studio Code</summary>
> <ul>
> <li>Press [Ctrl/Cmd] + [Shift] + [P] to open the command palette.</li>
> <li>Type "snippets" and select "Snippets: Configure Snippets".</li>
> <li>Create a new global snippets file or select one that you already have (not `snippets.json`!)</li>
> <li>Add the following JSON to the selected `.code-snippets` file:
> <pre>"winzig css": {
> &Tab;"scope": "javascriptreact,typescriptreact",
> &Tab;"prefix": "css",
> &Tab;"body": [
> &Tab;&Tab;"{css`",
> &Tab;&Tab;"\t$1"
> &Tab;&Tab;"`}"
> &Tab;],
> &Tab;"description": "winzig css"
> },</pre>
> </li>
> </details>
>
> Additionally, to get syntax highlighting for the embedded CSS code, install a suitable extension like [Inline HTML](https://marketplace.visualstudio.com/items?itemName=pushqrdx.inline-html) for VSCode.

Embedded CSS is always scoped to the current element an does not propagate to child components:

```tsx
const DivComponent = () => <div>
	This text is not red.
</div>;

return <>
	<div>
		This text is red.
	</div>
	<DivComponent />
	{css`
		div {
			color: red;
		}
	`}
</>;
```

### Live variables and expressions

Embedding live variables in complicated expressions in JSX elements will _just work_ like you'd expect:

```tsx
return <div>
	Count: {count$}<br />
	Double count: {count$ * 2}
	...
</div>;
```

You can also create live variables that are dependent on other live variables with the [`using` keyword](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management):

```tsx
let count$ = 0;
using doubleCount$ = count$ * 2;

return <div>
	Count: {count$}<br />
	Double count: {doubleCount$}
	...
</div>;
```

Note that this is essentially a hack hijacking an already existing JavaScript/TypeScript keyword and using it for a different purpose. These declarations get converted to live variable `let` declarations in the compilation step. If you do want to use the original `using` keyword for [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management), simply leave out the dollar sign.

You can create a side effect expression that automatically subscribes to changes of live variables by prefixing it with a `$:` label, similarly to how it works in Svelte:

```tsx
// This will get executed once and every time `count$` changes
$: console.log(`Count is now ${count$}.`);
```

If you want to execute something only if a dependency live variable changes, but not initially, wrap your code into an anonymous arrow function:

```tsx
// This will get executed every time `count$` changes, but not at the beginning
$: () => console.log(`Count has been changed to ${count$}.`);
```

For example, here is a simple counter component that persists the count across site visits:

```tsx
const Counter = () => {
	let count$ = +(localStorage.getItem("count") || 0);
	$: () => localStorage.setItem("count", count$.toString());

	return <div>
		Count: {count$}
		<br />
		<button on:click={() => ++count$}>increase</button> { }
		<button on:click={() => --count$}>decrease</button>
	</div>;
};
```

### Components

Components can accept props:

```tsx
const Counter = ({ initialCount = 0 }) => {
	let count$ = initialCount;
	// ...
};

// Somewhere else:
<Counter initialCount={42} />
```

If you want to pass children to a component, use the `<slot />` element in the component:

```tsx
const FancyButton = () => {
	return <button>
		<slot />
		{css`
			/* make the button fancy */
		`}
	</button>;
};

// Somewhere else:
<FancyButton>I am super ✨fancy✨</FancyButton>
```

You have to make sure by yourself that the `<slot />` element is used **at most once** per component.

### Arrays

TODO: Implement and document live arrays.

## CLI options
- `-w`, `--watch`: Watch for file changes in the `src` folder and rebuild the project.
- `-o`, `--output`: The path to the root folder where the project is saved to. (default: `./`)
- `--appfiles`: The path to the folder where the compiled JavaScript files will be saved. (default: `./appfiles/`)
- `--pretty`: Do not minify JavaScript output files.
- `--live-reload`: Enable live reloading. Requires `--watch` to be enabled.
- `-d`, `--dev`: Shortcut for `--watch`, `--pretty`, `--no-prerender` and `--live-reload`.
- `--no-prerender`: Disable prerendering
- `--keep-prerender-folder`: Keep winzig's internal `.winzig-prerender` folder after building.
- `--log-level`: Log level. Set to `verbose` for verbose logging.
