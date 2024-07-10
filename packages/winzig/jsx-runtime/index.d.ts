
export namespace JSX {
	type Element = HTMLElement & { value?: string };

	interface IntrinsicElements {
		div: { id?: string };
		ul: {};
		li: {};
		button: {
			[key: `on:${string}`]: any;
		};
		input: { type?: string, value?: string, name?: string };
		form: {
			[key: `on:${string}`]: any;
		};
	}
}

declare global {
	interface Element {
		(): this;
	}
}

// export * from "react/jsx-runtime";
