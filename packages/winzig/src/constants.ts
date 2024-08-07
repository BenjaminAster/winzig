
export const initialCSS = `
@layer {
	:root {
		color-scheme: dark light;
		font-family: system-ui, sans-serif;
		font-size-adjust: cap-height from-font;
		overflow-wrap: break-word;
		line-height: 1.5;
		scrollbar-color: light-dark(#ddd, #444) transparent;
		background-color: Canvas;
		-webkit-text-size-adjust: none;
		text-size-adjust: none;
		-webkit-tap-highlight-color: transparent;
	}

	body {
		display: flow-root;
		box-sizing: border-box;
		min-block-size: 100dvb;
		margin: 0;
	}
}

wz-frag {
	display: contents;
}
`;
