
import { CSSReference } from "./runtime.ts";

// export const asdf = () => console.log("hello from winzig/src/index.ts");

const cssMap = new WeakMap<TemplateStringsArray, string>();

let currentUniqueId = 0;
const createUniqueId = () => (++currentUniqueId).toString(36);


export const css = (templateArray: TemplateStringsArray, ...args: any[]) => {
	let id = cssMap.get(templateArray);
	if (!id) {
		let string = "";
		for (let i = 0; i < args.length; i++) {
			string += templateArray[i] + args[i];
		}
		string += templateArray[templateArray.length - 1];
		id = createUniqueId();
		cssMap.set(templateArray, id);
		{
			const style = document.createElement("style");
			style.textContent = `@scope ([data-wz-id="${id}"]) { ${string} }`;
			style.dataset.wzStyleId = id;
			document.head.append(style);
		}
	}
	return new CSSReference(id);
};
