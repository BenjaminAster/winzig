
import { css, type Config as WinzigConfig } from "winzig";

import { database } from "./utils.ts";

winzigConfig: ({
	output: "../",
	appfiles: "appfiles",
	css: "./global.css",
	noCSSScopeRules: true,
}) satisfies WinzigConfig;

const today = new Date().toLocaleDateString("en-CA", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

if (!await database.get(today)) {
	await database.put({ date: today, thingsDone: [] });
}

const dailyThingsDone: { date: string, thingsDone$: string[]; }[] =
	(await database.getAll()).reverse().map(({ date, thingsDone }: any) => ({ date, thingsDone$: thingsDone }));

const formatter = new Intl.DateTimeFormat("en-US", {
	weekday: "long",
	year: "numeric",
	month: "long",
	day: "numeric",
});

const updateDatabaseEntriesForDate = (date: string, thingsDone: string[]) => {
	database.put({ date, thingsDone });
};

const selection = document.getSelection();

const onBeforeInput = function (event: InputEvent) {
	if (event.inputType.startsWith("format")) {
		event.preventDefault();
	} else {
		const [{ startContainer: container, startOffset, endOffset }] = event.getTargetRanges() as any as ({ startOffset: number, endOffset: number, startContainer: Text; })[];
		if (event.inputType === "insertParagraph") {
			event.preventDefault();
		} else if (event.dataTransfer) {
			event.preventDefault();
			const insertedText = event.dataTransfer.getData("text/plain").replaceAll("\r", "");
			container.replaceData(startOffset, endOffset - startOffset, insertedText);
			selection.collapse(container, startOffset + insertedText.length);
		}
	}
};

const Input = ({ initialValue = "" }: { initialValue?: string; }) => {
	return <div spellcheck={false} contentEditable="true" enterKeyHint="done" on:beforeinput={onBeforeInput}>
		{initialValue}
		{css`
			& {
				outline: none;
				border-radius: .2em;
				padding-inline: var(--padding-inline);
				padding-block: .1em;
				white-space-collapse: preserve;
				flex-grow: 1;
				position: relative;

				&:hover {
					background-color: #9991;
				}
				&:focus-visible {
					background-color: #9993;
				}

				&:empty::before {
					content: "New item...";
					pointer-events: none;
					position: absolute;
					color: color-mix(in srgb, currentColor, transparent 30%);
				}

				&:empty::after {
					/* hack against weird Firefox bug */
					content: "\\A ";
					pointer-events: none;
				}
			}
		`}
	</div>;
};

<html lang="en">
	<head>
		<title>Daily Ping</title>
		<meta name="description" content="Record what you did every day." />
		<link rel="icon" href="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Spiral%20calendar/3D/spiral_calendar_3d.png" />
		<link rel="manifest" href="./app.webmanifest" />
	</head>
	<body>
		<main>
			<h1>Daily Ping</h1>
			<p>
				Record daily updates of what you did today.
			</p>
			<details>
				<summary>
					More info
				</summary>
				<p>
					This was my <a href="https://github.com/Algorithm-Arena/weekly-challenge-31-daily-ping/issues/1">entry</a> for <a href="https://github.com/Algorithm-Arena/weekly-challenge-31-daily-ping">Algorithm Arena Daily Challenge #31</a>.
				</p>
			</details>
			<ul>
				{...dailyThingsDone.map(({ date, thingsDone$ }) => {
					$: () => updateDatabaseEntriesForDate(date, thingsDone$);
					const [year, month, day] = date.split("-").map(Number);
					let newItemInput: HTMLDivElement;
					const submit = () => {
						if (!newItemInput.textContent) return;
						thingsDone$.push(newItemInput.textContent);
						newItemInput.textContent = "";
					};
					return <li>
						<h2>{formatter.format(new Date(year, month - 1, day))}</h2>
						<div>
							<ul>
								{...thingsDone$.map((thingDone, index$) => <li className="list-item">
									<Input initialValue={thingDone} on:blur={function () {
										if (this.textContent !== thingDone) {
											thingsDone$[index$] = thingDone = this.textContent;
										}
									}}>{thingDone}</Input>
									<button on:click={() => thingsDone$.splice(index$, 1)}>x</button>
								</li>)}
								{css`
									& {
										display: contents;
										list-style: inherit;
									}
								`}
							</ul>
							<form className="list-item" on:submit_preventDefault={submit}>
								{newItemInput = <Input on:keydown={({ key, shiftKey }) => {
									if (key === "Enter" && !shiftKey) submit();
								}} />}
								<button>+</button>
							</form>
							{css`
								& {
									display: flex;
									flex-direction: column;
									--padding-inline: .2em;
								}

								.list-item {
									display: flex;

									& .text-area {
										flex-grow: 1;
									}

									& button {
										display: block;
										font-family: monospace;
										background-color: #9993;
										padding-inline: .7em;
										border-radius: .2em;
										padding-block: .1em .2em;
										margin-block: 2px;
										margin-inline-start: .4em;
										flex-shrink: 0;
										flex-grow: 0;
										flex-basis: 0;
										justify-self: center;
										align-self: start;
									}

									&::before {
										content: "";
										--size: 6px;
										inline-size: var(--size);
										block-size: var(--size);
										display: block;
										border-radius: 50%;
										margin-block-start: 12px;
										margin-inline-end: 4px;
									}

									&:is(li)::before {
										background-color: currentColor;
									}
								}
							`}
						</div>

						{css`
							&:not(:first-child)::before {
								content: "";
								display: block;
								background-color: #9995;
								block-size: 1px;
								border: none;
								margin-block: 1em 0;
							}

							h2 {
								font-size: 1.2rem;
							}
						`}
					</li>;
				})}
			</ul>
			{css`
				& {
					margin-inline: auto;
					max-inline-size: 45rem;
					padding-inline: 1rem;
				}
			`}
		</main>
	</body>
</html>;
