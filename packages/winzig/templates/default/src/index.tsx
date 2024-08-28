
import { css, type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	appfiles: "appfiles",
	output: "../",
	css: "./global.css",
	// Temporarily uncomment this if you want to support Firefox until it ships the CSS @scope rule.
	// Note that this will make styles leak to child components and selectors must not start with an element type!
	// noCSSScopeRules: true,
}) satisfies WinzigConfig;

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
			}
		`}
	</>;
};

const title = "Winzig Template";

;
<html lang="en">
	<head>
		<title>{title}</title>
		<meta name="description" content={`${title} - An app build with winzig.`} />
	</head>
	<body>
		<main>
			<h1>{title}</h1>
			<p>Run <code>winzig --dev</code> and edit <span className="link">src/index.tsx</span> to get started.</p>
			<Counter />

			{css`
				& {
					padding-inline: 1rem;
				}

				.link {
					color: light-dark(brown, sandybrown);
					text-decoration-line: underline;
				}

				code {
					background-color: #9993;
					padding-inline: .3em;
				}
			`}
		</main>
	</body>
</html>;
