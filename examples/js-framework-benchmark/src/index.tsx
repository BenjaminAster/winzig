
import { type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	output: "../",
	appfiles: "appfiles",
}) satisfies WinzigConfig;

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colors = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const random = (max: number) => Math.round(Math.random() * 1000) % max;

let nextId = 1;

const buildData = (count: number) => {
	let data = new Array(count);
	for (let i = 0; i < count; i++) {
		data[i] = {
			id: nextId++,
			label$: `${adjectives[random(adjectives.length)]} ${colors[random(colors.length)]} ${nouns[random(nouns.length)]}`,
		};
	}
	return data;
};

const Button = ({ id, text, fn }: any) => (
	<div className="col-sm-6 smallpad">
		<button id={id} className="btn btn-primary btn-block" type="button" on:click={fn}>
			{text}
		</button>
	</div>
);

const App = () => {
	let data$: any[] = [];
	let selected$: number = null;
	const run = () => data$ = buildData(1_000);
	const runLots = () => data$ = buildData(10_000);
	const add = () => data$.push(...buildData(1_000));
	const update = () => {
		for (let i = 0; i < data$.length; i += 10) {
			data$[i].label$ += " !!!";
		}
	};
	const clear = (): any[] => data$ = [];
	const swapRows = () => {
		if (data$.length > 998) {
			let item = data$[1];
			data$[1] = data$[998];
			data$[998] = item;
		}
	};

	return (
		<div id="main" className="container">
			<div className="jumbotron">
				<div className="row">
					<div className="col-md-6">
						<h1>Winzig</h1>
					</div>
					<div className="col-md-6">
						<div className="row">
							<Button id="run" text="Create 1,000 rows" fn={run} />
							<Button id="runlots" text="Create 10,000 rows" fn={runLots} />
							<Button id="add" text="Append 1,000 rows" fn={add} />
							<Button id="update" text="Update every 10th row" fn={update} />
							<Button id="clear" text="Clear" fn={clear} />
							<Button id="swaprows" text="Swap Rows" fn={swapRows} />
						</div>
					</div>
				</div>
			</div>
			<table className="table table-hover table-striped test-data">
				<tbody>
					{...data$.map((row) => {
						let rowId = row.id;
						return (
							<tr className={selected$ === rowId ? "danger" : ""}>
								<td className="col-md-1">{rowId}</td>
								<td className="col-md-4">
									<a on:click={() => selected$ = rowId}>{row.label$}</a>
								</td>
								<td className="col-md-1">
									<a className="btn" on:click={() => data$.splice(data$.findIndex((d) => d.id === rowId), 1)}>
										<span className="glyphicon glyphicon-remove" aria-hidden="true" />
									</a>
								</td>
								<td className="col-md-6" />
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

;
<html lang="en">
	<head>
		<title>Winzig-keyed</title>
		{/* <link rel="stylesheet" href="/css/currentStyle.css" /> */}
		<link rel="stylesheet" href="https://rawcdn.githack.com/krausest/js-framework-benchmark/master/css/bootstrap/dist/css/bootstrap.min.css" />
		<link rel="stylesheet" href="https://rawcdn.githack.com/krausest/js-framework-benchmark/master/css/main.css" />
	</head>
	<body>
		<App />
	</body>
</html>;
