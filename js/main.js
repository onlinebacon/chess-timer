const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const buildPlayers = (t1, t2) => {
	const totalTime = Math.max(t1, t2);
	const players = [{
		other: null,
		time: t1,
		totalTime,
		turnStartedAt: null,
		turnStartedWith: null,
		running: false,
	}, {
		other: null,
		time: t2,
		totalTime,
		turnStartedAt: null,
		turnStartedWith: null,
		running: false,
	}]
	players[0].other = players[1];
	players[1].other = players[0];
	return players;
};

let mainWidth;
let mainHeight;
let x0, y0;
let playerX0;
let playerXOffset;
let cx, cy;
let clockRadius;
let clockArcThickness;

const updatePositions = () => {
	let spacingRatio = 0.05;
	let mainRatio = 2 - spacingRatio;
	let screenRatio = canvas.width/canvas.height;
	const screenIsWider = screenRatio > mainRatio;
	if (screenIsWider) {
		mainHeight = canvas.height;
		mainWidth = mainHeight*mainRatio;
	} else {
		mainWidth = canvas.width;
		mainHeight = mainWidth/mainRatio;
	}
	let spacing = spacingRatio*mainHeight;
	clockRadius = mainHeight*0.5 - spacing;
	x0 = (canvas.width - mainWidth)*0.5;
	y0 = (canvas.height - mainHeight)*0.5;
	cx = canvas.width*0.5;
	cy = canvas.height*0.5;
	playerX0 = x0 + spacing + clockRadius;
	playerXOffset = clockRadius + spacing + clockRadius;
	clockArcThickness = clockRadius*0.15;
};

const getSecondsNow = () => Date.now()/1000;

const updatePlayer = (player, now) => {
	if (!player.running) return;
	const elapsed = now - player.turnStartedAt;
	player.time = Math.max(0, player.turnStartedWith - elapsed);
};

const startPlayerTurn = (player, now) => {
	player.turnStartedAt = now;
	player.turnStartedWith = player.time;
	player.running = true;
};

const endPlayerTurn = (player, now) => {
	player.time = player.turnStartedWith - (now - player.turnStartedAt);
	player.turnStartedAt = null;
	player.turnStartedWith = null;
	player.running = false;
};

const twoDigs = (value) => value.toString().padStart(2, '0');

const stringifyTime = (time) => {
	let total = Math.ceil(time*100);
	const csec = total % 100;
	total = Math.round((total - csec)/100);
	const sec = total % 60;
	total = Math.round((total - sec)/60);
	const min = total % 60;
	total = Math.round((total - min)/60);
	const hours = total;
	if (hours !== 0) {
		return `${hours}:${twoDigs(min)}:${twoDigs(sec)}`;
	}
	if (min !== 0) {
		return `${min}:${twoDigs(sec)}`;
	}
	return `${sec}.${twoDigs(csec)}`;
};

const resizeCanvas = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	updatePositions();
};

const clear = () => {
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const drawTime = (time, x, y) => {
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = clockRadius*0.35 + 'px monospace';
	ctx.fillText(stringifyTime(time), x, y);
};

const drawProgressArc = (progress, radius, thickness, x, y) => {
	const ang0 = - Math.PI/2 + progress*Math.PI*2;
	const ang1 = Math.PI*1.5;
	ctx.lineWidth = thickness;
	ctx.beginPath();
	ctx.arc(x, y, radius - thickness*0.5, ang0, ang1);
	ctx.stroke();
};

const interpolateColors = (color0, val0, color1, val1, val) => {
	const [ r0, g0, b0 ] = color0;
	const [ r1, g1, b1 ] = color1;
	const w1 = (val - val0)/(val1 - val0);
	const w0 = 1 - w1;
	return [
		Math.round(w0*r0 + w1*r1),
		Math.round(w0*g0 + w1*g1),
		Math.round(w0*b0 + w1*b1),
	];
};

const safeProg = 1/3;
const dangProg = 0.9;
const warnProg = (safeProg + dangProg)/2;
const level0Color = [ 0, 255, 192 ];
const level1Color = [ 255, 192, 0 ];
const level2Color = [ 192, 0, 0 ];
const progressToColor = (progress) => {
	if (progress <= safeProg) return `rgb(${level0Color})`;
	if (progress < warnProg) return `rgb(${interpolateColors(
		level0Color, safeProg,
		level1Color, warnProg,
		progress,
	)})`
	if (progress < dangProg) return `rgb(${interpolateColors(
		level1Color, warnProg,
		level2Color, dangProg,
		progress,
	)})`
	return `rgb(${level2Color})`;
};

const drawPlayer = (index) => {
	let x = playerX0 + playerXOffset*index;
	let y = cy;
	const player = players[index];
	const progress = 1 - player.time / player.totalTime;
	const color = progressToColor(progress);
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	drawProgressArc(progress, clockRadius, clockArcThickness, x, y);
	drawTime(player.time, x, y);
};

const render = () => {
	clear();
	drawPlayer(0);
	drawPlayer(1);
};

const update = () => {
	const now = getSecondsNow();
	for (const player of players) {
		updatePlayer(player, now);
	}
};

window.addEventListener('resize', () => {
	resizeCanvas();
	render();
});

const frameLoop = () => {
	update();
	render();
	requestAnimationFrame(frameLoop);
};

const handleTouch = (x, y) => {
	const now = getSecondsNow();
	let player = x >= cx ? players[1] : players[0];
	if (player.time === 0 || player.other.time === 0) {
		return;
	}
	if (player.running) {
		endPlayerTurn(player, now);
		startPlayerTurn(player.other, now);
		return;
	}
	if (!player.other.running) {
		startPlayerTurn(player.other, now);
		return;
	}
};

canvas.addEventListener('touchstart', e => {
	e.preventDefault();
	e.stopPropagation();
	const touch = e.touches[0];
	const x = touch.clientX;
	const y = touch.clientY;
	handleTouch(x, y);
});

canvas.addEventListener('mousedown', e => {
	e.preventDefault();
	e.stopPropagation();
	const x = e.offsetX;
	const y = e.offsetY;
	handleTouch(x, y);
});

const parseTimeParam = (value) => {
	if (/m$/i.test(value)) {
		return Number(value.replace(/m$/i, ''))*60;
	}
	if (/h$/i.test(value)) {
		return Number(value.replace(/h$/i, ''))*60*60;
	}
	return Number(value);
};

const getInitialTimes = () => {
	const params = new Proxy(new URLSearchParams(window.location.search), {
		get: (searchParams, prop) => searchParams.get(prop),
	});
	const { t, t1, t2 } = params;
	return [ t1 || t, t2 || t ].map(val => parseTimeParam(val || '5m'));
};

const players = buildPlayers(...getInitialTimes());
resizeCanvas();
frameLoop();
