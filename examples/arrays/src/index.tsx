
import { css, type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	appfiles: "appfiles",
	output: "../",
	css: "./global.css",
	// Temporarily uncomment this if you want to support Firefox until it ships the CSS @scope rule.
	// Note that this will make styles leak to child components and selectors must not start with an element type!
	// noCSSScopeRules: true,
}) satisfies WinzigConfig;

const randomNumber = () => Math.floor(Math.exp(Math.random() * 15));
let array$ = Array.from({ length: 6 }, randomNumber);

const title = "Winzig Arrays Showcase";

;
<html lang="en">
	<head>
		<title>{title}</title>
		<meta name="description" content={`${title} - An app build with winzig.`} />
	</head>
	<body>
		<main>
			<h1>{title}</h1>

			<div>
				<button on:click={() => array$.push(randomNumber())}><code>array$.push(random)</code></button><br />
				<button on:click={() => array$.unshift(randomNumber())}><code>array$.unshift(random)</code></button><br />
				<button on:click={() => array$.pop()}><code>array$.pop()</code></button><br />
				<button on:click={() => array$.shift()}><code>array$.shift()</code></button><br />
				<button on:click={() => array$.splice(2, 3)}><code>array$.splice(2, 3)</code></button><br />
				<button on:click={() => array$.splice(2, 0, 100, 200, 300)}><code>array$.splice(2, 0, 100, 200, 300)</code></button><br />
				<button on:click={() => array$.splice(0, 5, 100, 200, 300)}><code>array$.splice(0, 5, 100, 200, 300)</code></button><br />
				<button on:click={() => array$.copyWithin(1, 4, 6)}><code>array$.copyWithin(1, 4, 6)</code></button><br />
				<button on:click={() => array$.fill(42)}><code>array$.fill(42)</code></button><br />
				<button on:click={() => array$.fill(123, 3, 6)}><code>array$.fill(123, 3, 6)</code></button><br />
				<button on:click={() => array$.sort((a, b) => a - b)}><code>array$.sort((a, b) =&gt; a - b)</code></button><br />
				<button on:click={() => array$.reverse()}><code>array$.reverse()</code></button><br />
				<button on:click={() => array$[2] = 42}><code>array$[2] = 42</code></button><br />
				<button on:click={() => array$[2] += 42}><code>array$[2] += 42</code></button><br />
				<button on:click={() => ++array$[2]}><code>++array$[2]</code></button><br />
			</div>

			<ul>
				{...array$.map((item, index$) =>
					<li>
						Item {index$}: {item}
					</li>
				)}
			</ul>

			{css`
				& {
					padding-inline: 1rem;
				}

				div, ul {
					display: inline flow-root;
					vertical-align: top;
				}
			`}
		</main>
	</body>
</html>;
