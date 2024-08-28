
import { css, type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	appfiles: "appfiles",
	output: "../",
	css: "./global.css",
	noCSSScopeRules: true,
}) satisfies WinzigConfig;

const liveArray$ = [100, 200, 300];

// console.log(liveArray$);

// let counter = 0;
// let arrayCollected = false;


// (async function allocateMemory() {
// 	// Allocate 50000 functions — a lot of memory!
// 	// liveArray.map((item) => <div>hello {item}</div>);
// 	// Array.from({ length: 50000 }, () => () => { });
// 	// if (counter > 100) return;
// 	// counter++;
// 	for (let i = 0; i < 1000; ++i) {
// 		// Array.from({ length: 50000 }, () => () => { });
// 		counter++;
// 		// liveArray.map((item) => <div>hello {item}</div>);
// 		// liveArray.map((item) => <div>hello {item}</div>);
// 		// liveArray.map((item) => (Array.from({ length: 1000 }, () => () => { })));
// 		liveArray.map((item) => (Array.from({ length: 1000 }, () => <div>hello</div>)));
// 	}
// 	await new Promise(res => setTimeout(res, 100));
// 	allocateMemory();
// })();

// (async () => {
// })();

setInterval(() => {
	liveArray$[Math.random() * liveArray$.length | 0] += 4;
}, 1000);

// let a = 6969n;
// console.log(a);


console.log(liveArray$[2] = 5);
console.log(liveArray$[2] += 5);
console.log(liveArray$[2] &&= 5);
console.log(++liveArray$[2]);
console.log(liveArray$[2]++);


const FancyButton = ({ }, children: any[]) => {
	return <button>
		{...children}
		{css`
			& {
				background: linear-gradient(to right, violet, deeppink);
				color: black;
				border: none;
			}

			.super-fancy {
				font-weight: bold;
				text-transform: uppercase;
			}
		`}
	</button>;
};

;
<html lang="en">
	<head>
		<title>Winzig Code Template</title>
	</head>
	<body>
		<div>
			<ul>
				<li>first list item</li>
				{...liveArray$.map((item, index$) => <li>
					{index$}: {item}
				</li>)}
				<li>last list item</li>
			</ul>
			<div>
				{5}<br />
				{true}
			</div>
			<button on:click={() => liveArray$.push(Math.random())}>add</button>

			<FancyButton>
				I am super <span className="super-fancy">✨fancy✨</span>
			</FancyButton>
			{css`
				& {
					color: light-dark(red, tomato);
				}

				div {
					color: light-dark(blue, lightskyblue);
				}
			`}
		</div>
	</body>
</html>;
