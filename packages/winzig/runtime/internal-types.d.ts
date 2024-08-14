
declare module "$appfiles/winzig-original-runtime.js" {
	export var j: typeof import("./index.ts").j;
	export var s: typeof import("./index.ts").s;
	export var V: typeof import("./index.ts").V;
	export var e: typeof import("./index.ts").e;
	export var l: typeof import("./index.ts").l;
	export var f: typeof import("./index.ts").f;
}

declare module "$appfiles/winzig-runtime.js" {
	export var buildData: typeof import("./prerender-runtime.ts").buildData;
}
