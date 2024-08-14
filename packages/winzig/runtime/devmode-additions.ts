
declare var __winzig__webSocketPort: number;

const formatMessage = (message: string) => {
	return [`%c[winzig]%c ${message}`, "color: light-dark(blue, skyblue); font-weight: bold;", ""];
};

const socket = new WebSocket(`ws://localhost:${__winzig__webSocketPort}/`);
socket.addEventListener("message", (event) => {
	const data = JSON.parse(event.data);
	if (data.type === "refresh-page") window.location.reload();
});

let connected = false;
socket.addEventListener("close", () => {
	if (connected) console.info(...formatMessage(`Live reload WebSocket disconnected.`));
	else console.info(...formatMessage(`Live reload WebSocket connection failed (port ${__winzig__webSocketPort}).`));
	connected = false;
});
socket.addEventListener("open", () => {
	connected = true;
	console.info(...formatMessage(`Live reload enabled (WebSocket connected at port ${__winzig__webSocketPort}).`));
});

export { };
