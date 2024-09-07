
# Winzig

Yet another reactive JavaScript (+CSS) frontend framework—but different.

<p align="center">
	<a href="https://www.npmjs.com/package/winzig">
		<!-- TODO: Make a better logo -->
		<img alt="winzig logo" src="./assets/logo.svg" width="120" />
	</a>
</p>

<p align="center">
	<a href="https://www.npmjs.com/package/winzig">
		<img alt="npm package version" src="https://img.shields.io/npm/v/winzig?style=for-the-badge&logo=npm&label=npm:%20winzig&logoColor=f44&labelColor=2d3137&color=06f" />
	</a>
</p>

> [!NOTE]
> 🚧 This project is still very much under construction. Apart from a few select examples, what you are trying to build will probably not work yet.

Winzig (pronounced _'vintsigg'_ [[ˈvɪnt͡sɪç]](https://de.wiktionary.org/wiki/winzig)) tries to keep things minimalistic while still being powerful and extensible. It tries to combine the nice DX that comes from the compiled nature of frameworks like [Svelte](https://svelte.dev/) with the [JSX/TSX](https://en.wikipedia.org/wiki/JSX_(JavaScript)) syntax and flexibility of frameworks like [React](https://react.dev/) or [SolidJS](https://www.solidjs.com/). For example, here is a simple counter app implemented with winzig (note that this one file (index.tsx), is&mdash;apart from a recommended `tsconfig.json` file&mdash;the only file that you need to get started):

```tsx
// src/index.tsx

import { css } from "winzig";

let count$ = 0; // the "$" suffix makes variables reactive

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
```

## Table of Contents

- [Introduction](#winzig)
- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
	* [File & Code Structure](#file--code-structure)
	* [Live Variables](#live-variables)
	* [Live Properties](#live-properties)
	* [Components](#components)
	* [CSS](#css)
	* [Live Expressions](#live-expressions)
	* [Derived Values](#derived-values)
	* [Side Effect Expressions](#side-effect-expressions)
	* [Event Listeners](#event-listeners)
	* [Elements](#elements)
	* [Live Arrays](#live-arrays)
- [Config Options](#config-options)
- [CLI Options](#cli-options)

## Getting Started

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

### File & Code Structure

The entry file of any winzig app must be called `index.tsx` and located in a subdirectory called `src`. It must contain a JSX `<html>` element with exactly two children; `<head>` and `<body>`. The following is an example of a minimalistic and admittedly not very exciting but valid and fully complete (!) winzig app:

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

Putting anonymous top-level JSX tags in your code like that might seem weird if you're used to other frameworks, but note that winzig is a compiler and therefore does not have to play by any rules.

### Live Variables

If you suffix a variable name with a dollar sign (`$`), it gets compiled to a reactive "live variable":

```tsx
// src/index.tsx

let count$ = 0;

setInterval(() => ++count$, 1000);

<html lang="en">
	<head>
		<title>Counter App</title>
	</head>
	<body>
		Count: {count$}
	</body>
</html>;
```

In the example above, the `{count$}` expression in the document will automatically update every second.

### Live Properties

Properties can also be made live and behave very similar to live variables:

```tsx
let stateOrWhatever = {
	count$ = 0,
};

// Somewhere else:
<div>{stateOrWhatever.count$}</div>
```

Reactive live properties can also be destructured:

```tsx
let { count$ } = stateOrWhatever;

// Somewhere else:
<div>{count$}</div>
```

### Components

Components work just like you'd expect:

```tsx
// src/index.tsx

const Counter = () => {
	let count$ = 0;

	setInterval(() => ++count$, 1000);

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

Note that component functions are only called once at instanciation and not every time anything updates (like in React), so things like `setInterval()` are entirely possible (just like it is the case in e.g. SolidJS or Svelte). Also, components are really just functions and have nothing to do with reactivity behavior, just like in SolidJS.

Components can also accept props:

```tsx
const Counter = ({ initialCount = 0 }) => {
	let count$ = initialCount;
	// ...
};

// Somewhere else:
<Counter initialCount={42} />
```

Children are passed to components as the function's second parameter:

```tsx
const FancyButton = ({ }, children: any[]) => {
	return <button>
		{...children}
		{/* Make the button fancy somehow - See next section ("CSS") */}
	</button>;
};

// Somewhere else:
<FancyButton>
	I am super <span className="super-fancy">✨fancy✨</span>
</FancyButton>
```

In the above example, the component doesn't accept any props but needs the children (which it gets from the second argument), so the first argument is simply left as an empty object destructuring expression.

> [!IMPORTANT]
> Make sure you always use the `{...spread}` syntax when inserting arrays into JSX elements! If you're coming from e.g. React, this is something you'll have to get used to!

### CSS

Elements can be styled by inserting a `` {css` ... `} `` call as the **last child** of an element:

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

**Technical info**: This `css` function does not actually exist; it's solely a way to put CSS into valid JSX/TSX syntax. `css` calls get removed in the compilation step and all CSS snippets get extracted into an external CSS file, with unique ids for the elements automatically being generated, so these CSS stylings have (almost) no runtime cost.

> [!TIP]
> In order to not manually type out the `` {css` ... `} `` each time, you can add custom code snippets in most code editors.
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

Embedded CSS is scoped to the current element and does not propagate to child components:

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

> [!NOTE]
> Internally, this is achieved via CSS' native [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) rule, which is currently not supported in Firefox. If you want your winzig app to work in Firefox, you can fall back to scoping via simple CSS selectors with the [`noCSSScopeRules`](#nocssscoperules) option in [winzig's configuration options](#config-options). Note however that this means that styles will leak into child components!

### Live Expressions

Embedding live variables in complicated expressions in JSX elements will _just work_ like you'd expect:

```tsx
return <div>
	Count: {count$}<br />
	Double count: {count$ * 2}
	Count is larger than ten? {count$ > 10 ? "yes" : "no"}
	...
</div>;
```

### Derived Values

You can create live variables that are dependent on other live variables (a.k.a. "derived values" a.k.a. "the [destiny operator](https://dev.to/this-is-learning/the-quest-for-reactivescript-3ka3#the-destiny-operator)") with the [`using` keyword](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management):

```tsx
let count$ = 0;
using doubleCount$ = count$ * 2;

return <div>
	Count: {count$}<br />
	Double count: {doubleCount$}
	...
</div>;
```

Such `using`-declared variables are _truly_ live in real time:

```tsx
let a$ = 5;
using b$ = a$ * 2;
console.log(b$); // logs 10
a$ = 20;
console.log(b$); // logs 40
```

> [!NOTE]
> This is essentially a hack hijacking an already existing JavaScript/TypeScript keyword and using it for a different purpose. These declarations get converted to live variable `let` declarations in the compilation step. Very conveniently, `using` declarations in JavaScript/TypeScript also forbid reassignments, just like it should be the case for derived values. If you _do_ actually want to use the original `using` keyword for [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management), simply leave out the dollar sign.

### Side effect expressions

You can create a side effect expression that automatically subscribes to changes of live variables by prefixing it with a `$:` label, similarly to how it works in Svelte (or rather used to work before Svelte 5):

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
	let count$ = +localStorage.getItem("count") || 0;
	$: () => localStorage.setItem("count", count$.toString());

	return <div>
		Count: {count$}
		<br />
		<button on:click={() => ++count$}>increase</button> { }
		<button on:click={() => --count$}>decrease</button>
	</div>;
};
```

### Event Listeners

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

This works even for components that return elements:

```tsx
const FancyButton = ({ }, children: any[]) => <button>
	{...children}
	{css` ... `}
</button>;

// Somewhre else:
<FancyButton on:click={doSomethingMagical}>Click me!</FancyButton>
```

You can add a `_preventDefault` modifier to implicitly call `event.preventDefault()` before executing the callback function:

```tsx
<form on:submit_preventDefault={() => /* ... */}>
	<input type="text" />
	<button>Submit</button>
</form>
```

### Elements

In winzig, JSX elements are actual DOM nodes and not some opaque internal abstraction, which means you can do all sorts of things with them:

```tsx
const canvas = <canvas width={width} height={height} />;
const context = canvas.getContext("2d");

// Somewhere else:
<div className="canvas-container-or-whatever">
	{canvas}
</div>
```

This is very convenient as it easily lets you get a reference to any element:

```tsx
let input: HTMLInputElement;

// Somewhere else:
<form on:submit_preventDefault={() => alert(input.value)}>
	{input = <input type="text" /> as HTMLInputElement}
	<button>Submit</button>
</form>
```

If you start your variable name with an uppercase letter, you can even use JSX elements as if they were components, although you may only use them once:

```tsx
const Canvas = <canvas />;
const context = Canvas.getContext("2d");

// Somewhere else:
<div className="canvas-container-or-whatever">
	<Canvas width={width} height={height} />
</div>
```

### Live Arrays

Live variables can also be arrays:

```tsx
let numbers$ = [1, 5, 20];

// Somewhere else:
<ul>
	{...numbers$.map((number) => <li>{number} is a cool number!</li>)}
</ul>
```

If you then modify the array, the list items in the example above would be automatically updated live.

```tsx
numbers$.push(Math.floor(Math.random() * 100));
// the <ul> now contains four child <li> elements
```

**Technical info**: Under the hood, when a live array is modified via one of the nine self-modifying array methods (`.copyWithin()`, `.fill()`, `.pop()`, `.push()`, `.reverse()`, `shift()`, `.sort()`, `.splice()` and `.unshift()`) or via indexed access (`array$[index] = whatever`), winzig tracks exactly what in the array is being changed and only updates the DOM nodes that need to be changed.

Since the index of an array item may change over time, the second parameter (`index`) in a live array's `.map()` method must be declared to the compiler as a live variable by suffixing it with a `$`. It will always hold the item's current position in the array and update everything accordingly, even if values are e.g. prepended to the array.

```tsx
<ul>
	{...numbers$.map((number, index$) => 
		<li>Item {index$}: {number} is a cool number!</li>
	)}
</ul>
```

## Config Options

Winzig can be configured by positioning an anonymous parenthesized object expression with a `winzigConfig` label somewhere in your index.tsx file:

```tsx
// src/index.tsx
import { type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	// ...options go here
}) satisfies WinzigConfig;
```

Note that this config object is parsed beforehand via simple regular expressions and therefore must specifiy only string literals and booleans. (i.e. no variables!)

The possible options are:

- `output`: The path to the root folder where the project is saved to. (default: `./`)
- `appfiles`: The path to the folder where the compiled JavaScript files will be saved. (default: `./appfiles/`)
- `css`: The path to a global CSS file.
- <span id="nocssscoperules">`noCSSScopeRules`</span>: Do not use CSS [@scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) rules in the generated CSS files and fall back to simple selectors [in order to support Firefox](https://caniuse.com/mdn-css_at-rules_scope). Note that this means that styles will leak to child components!
- `entries`: Additional JavaScript entry files, useful for web workers or conditional dynamic `import()`s. To utilize an such a JavaScript file in your code, use `import.meta.resolve("$appfiles/ENTRY_NAME.js")` to get the URL of the generated file. (Winzig auto-generates an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) mapping these special specifiers to the actual file.)
	```tsx
	winzigConfig: ({
		// ...
		entries: {
			worker: {
				src: "./worker.ts",
			},
		},
	}) satisfies WinzigConfig;

	// ...
	const worker = new Worker(import.meta.resolve("$appfiles/worker.js"), { type: "module" });
	```

	```tsx
	winzigConfig: ({
		// ...
		entries: {
			"some-polyfill-or-whatever": {
				src: "./some-polyfill-or-whatever.ts",
				preload: false,
			},
		},
	}) satisfies WinzigConfig;

	// ...
	if (needsSomePolyfillOrWhatever()) 
		await import(import.meta.resolve("$appfiles/some-polyfill-or-whatever.js"));
	```

## CLI Options
- `-w`, `--watch`: Watch for file changes in the `src` folder and rebuild the project.
- `--pretty`: Do not minify JavaScript output files.
- `--live-reload`: Enable live reloading. Requires `--watch` to be enabled.
- `-d`, `--dev`: Shortcut for `--watch`, `--pretty`, `--no-prerender` and `--live-reload`.
- `--no-prerender`: Disable prerendering.
- `--keep-prerender-folder`: Keep winzig's internal `.winzig-prerender` folder after building.
- `--log-level`: Log level. Set to `verbose` for verbose logging.

## Known Issues
- [BigInts](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) are currently not supported. (Blocked by https://github.com/terser/terser/pull/1555)
