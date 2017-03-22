var fs = require('fs');
var path = require('path');
var md5 = require('md5');

const utils = require('./utils.js');
var emitTo = utils.emitTo;
var loadRom = utils.loadRom;
var addIncomingBandwidth = utils.addIncomingBandwidth;

var io = require('socket.io')({
	transports: ['websocket'],
});

var playerQueue = [];
var connected = [];
var socketRoster = {};
var lastState;
var timeStart;

const minsPerTurn = 2;

var currentRom = {};
const sendRomToPlayer = (target, socketId)=>{
	if (!currentRom.data || !currentRom.data.length) {
		console.log('no currentRom data');
		return;
	}

	emitTo(target,
		'rom:data',
		{
			rom: currentRom.data,
			name: currentRom.name,
		},
		`Sending ROM data ${!!socketId ? `to ${socketId}` : ''}`
	);
}

const sendRomToPlayers = (rom)=>{
	return new Promise((resolve)=>{
		var name = rom.name;
		var data = rom.data;

		const connections = connected || [];

		connections.forEach(socketId => {
			const socket = socketRoster[socketId].socket;
			if (socket) {
				sendRomToPlayer(socket, socketId);
			}
		});

		resolve({ name, data });
	});
};


const getTurnTimeRemaining = ()=>{
	const elapsedTime = timeStart ? (Date.now() - timeStart) : 0;
	const timeLeft = (minsPerTurn * 60) - elapsedTime;
	return playerQueue.length ? timeLeft : 0;
};

var getGameStateInfo = socketId => ({
	timeLeft: getTurnTimeRemaining(),
	total: playerQueue.length,
	audience: connected.length,
	isInQueue: playerQueue.indexOf(socketId) !== -1,
	place: playerQueue.indexOf(socketId) + 1,
});

const updateAllGameStates = ()=>{
	connected.forEach(socketId => {
		emitTo(socketRoster[socketId].socket, 'info:update', getGameStateInfo(socketId), `Emitting info:update to ${socketId}`);
	});
};


var currentPlayers = [];


// audience/connections
const removeConnection = (socketId) => {
	connected = connected.filter(id => id === socketId);
};
const addConnection = (socketId) => {
	if (connected.indexOf(socketId) === -1) {
		connected.push(socketId);
	}
};
const updateSocketRoster = (socketId, socket) =>{
	socketRoster[socketId] = Object.assign({}, socketRoster[socketId]);
	socketRoster[socketId].socket = socket;
}


// queue
const addPlayerToQueue = (socketId)=>{
	if (playerQueue.indexOf(socketId) === -1) {
		playerQueue.push(socketId);
	}
};
const removePlayerFromQueue = (socketId) => {
	playerQueue = playerQueue.filter(id => id === socketId);
};


// playing
const newPlayer = (which, socketId) => {
	if (currentPlayers.indexOf(socketId) === -1) {
		currentPlayers[which] = socketId;
	}
};
const removePlayer = (socketId) => {
	currentPlayers = currentPlayers.filter(id => id === socketId);
};
const getPlayer = (which) => {
	return currentPlayers[which];
};
const getPlayerNumber = (socketId) => {
	return currentPlayers.findIndex(id === socketId);
};

var tickTimer;
const tick = () => {
	const firstPlayer = getPlayer(0);
	firstPlayer && emitTo(playerSocket, 'state:request', null, 'Requesting: P1 State');

	updateAllGameStates();

	setTimeout(tick, 1000);
};



// setInterval(updateAllGameStates, 1000);

const onConnect = (socket, socketId)=>{
	console.log(`new connection - ${socketId}`);
	addConnection(socketId);
	updateSocketRoster(socketId, socket);

	// if we have a loaded rom, send it down the line
	sendRomToPlayer(socket, socketId);
	// update with the last saved state
	emitTo(socket, 'info:update', getGameStateInfo(socketId));
};


io.on('connection', (socket) =>{
	const socketId = `${socket.handshake.address}-${socket.id}`;

	socket.on('disconnect', ()=>{
		removeConnection(socketId);
		removePlayerFromQueue(socketId);
		removePlayer(socketId);
	});


	socket.on('state:update', (data)=>{
		addIncomingBandwidth(data);
		const state = data.state;

		lastState = Object.assign({}, state);
	});

	socket.on('queue:join', () => addPlayerToQueue(socketId));

	socket.on('queue:leave', () => removePlayerFromQueue(socketId));

	socket.on('queue:status', () => emitTo(socket, 'info:update', getGameStateInfo(socketId)));

	socket.on('rom:loaded', ()=>{
		if (lastState) {
	  		emitTo(socket, 'state:update', lastState, 'Emitting state:update', true);
		}
	});


	// when the client emits 'new message', this listens and executes
	socket.on('input:down', (buttonPressed) => {
		addIncomingBandwidth(buttonPressed);
		const playerNumber = getPlayerNumber(socketId);
		if (playerNumber === -1) {
			return;
		}

		const eventData = {joypadButton: buttonPressed, player: playerNumber};
      	emitTo(socket.broadcast, 'input:down', eventData, 'Emitting input:down', true);
	});

	socket.on('input:up', (buttonDepressed) => {
		addIncomingBandwidth(buttonDepressed);
		const playerNumber = getPlayerNumber(socketId);
		if (playerNumber === -1) {
			return;
		}

		const eventData = {joypadButton: buttonDepressed, player: playerNumber};
      	emitTo(socket.broadcast, 'input:up', eventData, 'Emitting input:up', true);
	});

	onConnect(socket, socketId);
});


io.listen(3001);


loadRom('Super Mario Bros.', path.resolve(__dirname, '../../nES6/app/roms/SuperMarioBros.nes'))
	.then(sendRomToPlayers)
	.then(rom=>{
		var name = rom.name;
		var data = rom.data;

		console.log(`ROM "${name}" loaded! (${data.toString().length / 1000} KB)`);
		currentRom = {
		  	name,
		  	data,
		};

		// kick off
		tick();
	});