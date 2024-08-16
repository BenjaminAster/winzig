
// import { css } from "winzig";

let count$ = 5;
using doubleCount$ = count$ * 2;
$: console.log(count$);

const SomethingSomething = () => {
	return <div>
		<div>before slot</div>
		<slot />
		<div>after slot</div>
	</div>;
};

let Input = <input type="text" />;

<html lang="en">
	<head>
		<title>winzig showcase</title>
	</head>
	<body>
		Count: {count$}<br />
		Double count: {doubleCount$}<br />
		Triple count: {count$ * 3}<br />
		<button className={`count-${count$.toString(16)}`} on:click={() => ++count$}>increase count</button>
		<hr />
		<SomethingSomething>
			<div>child 1</div>
			<div>child 2</div>
		</SomethingSomething>
		<hr />
		<SomethingSomething />
	</body>;
</html>;
