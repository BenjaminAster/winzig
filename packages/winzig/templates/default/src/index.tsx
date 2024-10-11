
import { css, type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	output: "../",
	appfiles: "appfiles",
	css: "./main.css",
	// Temporarily uncomment this if you want to support Firefox until it ships the CSS @scope rule.
	// Note that this will make styles leak to child components and selectors must not start with an element type!
	// noCSSScopeRules: true,
}) satisfies WinzigConfig;

const storagePrefix = location.pathname + ":";

const Counter = () => {
	let count$ = 0;
	return <>
		Count: {count$}<br />
		<button on:click={() => ++count$}>+</button> { }
		<button on:click={() => --count$}>-</button>

		{css`
			button {
				font: bold 1.2em monospace;
				cursor: pointer;
				padding: .2em .6em;
				background-color: light-dark(#ddd, #333);
				border-radius: .2em;
			}
		`}
	</>;
};

const ThemeToggle = () => {
	const mediaMatch = window.matchMedia("(prefers-color-scheme: light)");
	const themeInStorage = localStorage.getItem(storagePrefix + "theme");
	let lightTheme$ = (themeInStorage === "auto" && mediaMatch.matches) || themeInStorage === "light";
	$: {
		const themeString = lightTheme$ ? "light" : "dark";
		localStorage.setItem(
			storagePrefix + "theme",
			(lightTheme$ === mediaMatch.matches) ? "auto" : themeString
		);
		document.documentElement.dataset.theme = themeString;
	}
	mediaMatch.addEventListener("change", ({ matches }) => lightTheme$ = matches);

	return <button on:click={() => lightTheme$ = !lightTheme$}>
		Switch to {lightTheme$ ? "dark" : "light"} theme
		{css`
			& {
				color: light-dark(#444, #ccc);
			}
		`}
	</button>;
};

const title = "Winzig Template";

;
<html lang="en">
	<head>
		<title>{title}</title>
		<meta name="description" content={`${title} - An app built with winzig.`} />
	</head>
	<body>
		<main>
			<h1>{title}</h1>
			<p>Run <code>winzig --dev</code> and edit <span className="link">src/index.tsx</span> to get started.</p>
			<Counter />

			{css`
				& {
					padding-inline: 1rem;
					flex-grow: 1;
				}

				.link {
					color: light-dark(brown, sandybrown);
					text-decoration-line: underline;
				}

				code {
					background-color: light-dark(#ddd, #333);
					padding-inline: .3em;
				}
			`}
		</main>

		<footer>
			<a href="https://github.com/BenjaminAster/winzig/tree/main/packages/winzig/templates/default">View source code</a>
			<div className="space" />
			
			<ThemeToggle />

			{css`
				& {
					display: flex;
					font-size: .9rem;
					flex-wrap: wrap;
					column-gap: 1rem;
					padding: .2rem .6rem;
					background-color: light-dark(#eee, #222);
				}

				.space {
					flex-grow: 1;
				}
			`}
		</footer>
	</body>
</html>;
