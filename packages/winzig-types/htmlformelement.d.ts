
declare namespace WinzigInternals {
	// manually copy-pasted from lib.dom.d.ts
	interface FormElementWithoutIndexedAccess extends HTMLElement {
		/**
		 * Sets or retrieves a list of character encodings for input data that must be accepted by the server processing the form.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/acceptCharset)
		 */
		acceptCharset: string;
		/**
		 * Sets or retrieves the URL to which the form content is sent for processing.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/action)
		 */
		action: string;
		/**
		 * Specifies whether autocomplete is applied to an editable text field.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/autocomplete)
		 */
		autocomplete: AutoFillBase;
		/**
		 * Retrieves a collection, in source order, of all controls in a given form.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/elements)
		 */
		readonly elements: HTMLFormControlsCollection;
		/**
		 * Sets or retrieves the MIME encoding for the form.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/encoding)
		 */
		encoding: string;
		/**
		 * Sets or retrieves the encoding type for the form.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/enctype)
		 */
		enctype: string;
		/**
		 * Sets or retrieves the number of objects in a collection.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/length)
		 */
		readonly length: number;
		/**
		 * Sets or retrieves how to send the form data to the server.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/method)
		 */
		method: string;
		/**
		 * Sets or retrieves the name of the object.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/name)
		 */
		name: string;
		/**
		 * Designates a form that is not validated when submitted.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/noValidate)
		 */
		noValidate: boolean;
		rel: string;
		readonly relList: DOMTokenList;
		/**
		 * Sets or retrieves the window or frame at which to target content.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/target)
		 */
		target: string;
		/**
		 * Returns whether a form will validate when it is submitted, without having to submit it.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/checkValidity)
		 */
		checkValidity(): boolean;
		/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reportValidity) */
		reportValidity(): boolean;
		/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/requestSubmit) */
		requestSubmit(submitter?: HTMLElement | null): void;
		/**
		 * Fires when the user resets a form.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset)
		 */
		reset(): void;
		/**
		 * Fires when a FORM is about to be submitted.
		 *
		 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit)
		 */
		submit(): void;
	}
}
