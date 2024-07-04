
let css: any;

const test = <div id="abc">
	hello {4} world!

	{css`
		color: red;
	`}
</div>;

document.body.append(test);

console.log("hello from index.tsx!")

export { };
