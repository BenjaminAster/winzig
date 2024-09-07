
export const database = new class {
	#database: IDBDatabase;
	#storeName = "daily-things-done";
	constructor() { };
	async init() {
		const request = window.indexedDB.open(new URL(document.baseURI).pathname, 1);
		request.addEventListener("upgradeneeded", () => {
			request.result.createObjectStore(this.#storeName, { keyPath: "date" });
		}, { once: true });
		request.addEventListener("error", () => console.error(request.error), { once: true });
		await new Promise((resolve) => request.addEventListener("success", resolve, { once: true }));
		this.#database = request.result;
	};

	async #operation(method: (argument?: any) => IDBRequest, argument?: any) {
		const store = this.#database.transaction(this.#storeName, "readwrite").objectStore(this.#storeName);
		const request: IDBRequest = method.call(store, argument);
		request.addEventListener("error", () => console.error(request.error), { once: true });
		await new Promise((resolve) => request.addEventListener("success", resolve, { once: true }));
		return request.result;
	};
	get = this.#operation.bind(this, IDBObjectStore.prototype.get);
	getAll = this.#operation.bind(this, IDBObjectStore.prototype.getAll);
	put = this.#operation.bind(this, IDBObjectStore.prototype.put);
	delete = this.#operation.bind(this, IDBObjectStore.prototype.delete);
};
await database.init();
