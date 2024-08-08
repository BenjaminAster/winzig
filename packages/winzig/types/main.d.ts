
export interface WinzigOptions {
	appfilesFolderPath?: string;
	outputFolderPath?: string;
	minify?: boolean;
	watch?: boolean;
	liveReload?: boolean;
	keepPrerenderFolder?: boolean;
}

export declare function init(options: WinzigOptions): Promise<void>;
