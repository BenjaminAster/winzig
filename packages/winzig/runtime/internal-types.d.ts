
declare module "$appfiles/winzig-original-runtime.js" {
	export var _j: typeof import("./index.ts")._j;
	export var _F: typeof import("./index.ts")._F;
	export var _V: typeof import("./index.ts")._V;
}

declare module "$appfiles/winzig-runtime.js" {
	export var buildData: typeof import("./prerender-runtime.ts").buildData;
}
