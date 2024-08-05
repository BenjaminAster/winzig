
declare var __winzig__webSocketPort: number;

const socket = new WebSocket(`ws://localhost:${__winzig__webSocketPort}/`);
socket.addEventListener("message", (event) => {
	const data = JSON.parse(event.data);
	if (data.type === "refresh-page") window.location.reload();
});

export { };
