var fs = require('fs');
var path = require('path');
var md5 = require('md5');

var utils = require('./utils.js');
var emitTo = utils.emitTo;
var loadRom = utils.loadRom;
var addIncomingBandwidth = utils.addIncomingBandwidth;

import {
	SERVER_SEND_INFO,
	SERVER_SEND_GAME_STATE,
	SERVER_SEND_ROM_BINARY,
	CLIENT_SEND_GAME_STATE,
	CLIENT_JOINED_QUEUE,
	CLIENT_LEFT_QUEUE,
	CLIENT_REQUESTED_ROM,
	CLIENT_LOADED_ROM,
	CLIENT_SEND_INPUT_DOWN,
	CLIENT_SEND_INPUT_UP,
	SERVER_SEND_INPUT_DOWN,
	SERVER_SEND_INPUT_UP,
	SERVER_REQUEST_CLIENT_GAME_STATE,
} from './constants.js';


/*
	███████╗███████╗████████╗██╗   ██╗██████╗
	██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗
	███████╗█████╗     ██║   ██║   ██║██████╔╝
	╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝
	███████║███████╗   ██║   ╚██████╔╝██║
	╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝
*/

var io = require('socket.io')({
	transports: ['websocket'],
});

// Game info
var playerQueue = [];
var connected = [];
var socketRoster = {};
var lastState;
var timeStart;
var minsPerTurn = 2;
var currentRom = {};

var currentPlayers = {
	0: null,
	1: null,
	// nES6 doesn't support fourscore yet
	// 2: null,
	// 3: null,
};

/**
 * Send binary ROM data to a target socket.
 *
 * @param  {Socket} target    Socket to send the data to.
 * @param  {string} targetId? Optional ID of target (for debugging)
 */
function transmitRom(target, targetId) {
	if (!currentRom.data || !currentRom.data.length) {
		console.log('no currentRom data');
		return;
	}

	emitTo(target,
		SERVER_SEND_ROM_BINARY,
		{
			rom: currentRom.data,
			name: currentRom.name,
		},
		`Sending ROM data ${!!targetId ? `to ${targetId}` : ''}`
	);
}

/**
 * Transmit ROM data to all connected sockets (audience + players).
 *
 * @param  {Object}  rom Object containing rom `name` and its binary `data`
 * @return {Promise}
 */
function sendRomToConnected(rom) {
	return new Promise((resolve)=>{
		var name = rom.name;
		var data = rom.data;

		var connections = connected || [];

		connections.forEach(socketId => {
			var socket = socketRoster[socketId].socket;
			if (socket) {
				transmitRom(socket, socketId);
			}
		});

		resolve({ name, data });
	});
}


/*
	 █████╗ ██╗   ██╗██████╗ ██╗███████╗███╗   ██╗ ██████╗███████╗
	██╔══██╗██║   ██║██╔══██╗██║██╔════╝████╗  ██║██╔════╝██╔════╝
	███████║██║   ██║██║  ██║██║█████╗  ██╔██╗ ██║██║     █████╗
	██╔══██║██║   ██║██║  ██║██║██╔══╝  ██║╚██╗██║██║     ██╔══╝
	██║  ██║╚██████╔╝██████╔╝██║███████╗██║ ╚████║╚██████╗███████╗
	╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
*/
function removeConnection(socketId) {
	connected = connected.filter(id => id === socketId);
}
function addConnection(socketId) {
	if (connected.indexOf(socketId) === -1) {
		connected.push(socketId);
	}
}
function updateSocketRoster(socketId, socket) {
	socketRoster[socketId] = Object.assign({}, socketRoster[socketId]);
	socketRoster[socketId].socket = socket;
}


/*
	 ██████╗ ██╗   ██╗███████╗██╗   ██╗███████╗
	██╔═══██╗██║   ██║██╔════╝██║   ██║██╔════╝
	██║   ██║██║   ██║█████╗  ██║   ██║█████╗
	██║▄▄ ██║██║   ██║██╔══╝  ██║   ██║██╔══╝
	╚██████╔╝╚██████╔╝███████╗╚██████╔╝███████╗
	 ╚══▀▀═╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝
*/
function addPlayerToQueue(socketId){
	const isAlreadyInQueue = playerQueue.indexOf(socketId) !== -1;
	const isAlreadyPlaying = getPlayerNumber(socketId) !== -1;

	if (!isAlreadyInQueue && !isAlreadyPlaying) {
		playerQueue.push(socketId);
	}
}
function removePlayerFromQueue(socketId) {
	playerQueue = playerQueue.filter(id => id === socketId);
}


/*
	██████╗ ██╗      █████╗ ██╗   ██╗███████╗██████╗ ███████╗
	██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝██╔════╝██╔══██╗██╔════╝
	██████╔╝██║     ███████║ ╚████╔╝ █████╗  ██████╔╝███████╗
	██╔═══╝ ██║     ██╔══██║  ╚██╔╝  ██╔══╝  ██╔══██╗╚════██║
	██║     ███████╗██║  ██║   ██║   ███████╗██║  ██║███████║
	╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝
*/
function setPlayer(which, socketId) {
	currentPlayers[which] = socketId;

	if (which === 0){
		timeStart = Date.now();
	}

	// remove the player from the queue, if they were in there at all
	removePlayerFromQueue(socketId);
}
function removePlayerBySocket(socketId) {
	for(var joypad in currentPlayers){
		if (currentPlayers.hasOwnProperty(joypad)){
			if(currentPlayers[joypad] === socketId) {
				delete currentPlayers[joypad];
			}
		}
	}
}
function unplugJoypad(which) {
	delete currentPlayers[which];
}

function getPlayerForJoypad(which) {
	return currentPlayers[which];
}
function getPlayerNumber(socketId) {
	var found = -1;
	for(var joypad in currentPlayers){
		if (currentPlayers[joypad] === socketId) {
			found = joypad;
		}
	}
	return found;
}

function isPlayerOne(socketId) {
	return getPlayerNumber(socketId) === 0;
}
function isPlayerTwo(socketId) {
	return getPlayerNumber(socketId) === 1;
}

/**
	███████╗ ██████╗  ██████╗██╗  ██╗███████╗████████╗
	██╔════╝██╔═══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝
	███████╗██║   ██║██║     █████╔╝ █████╗     ██║
	╚════██║██║   ██║██║     ██╔═██╗ ██╔══╝     ██║
	███████║╚██████╔╝╚██████╗██║  ██╗███████╗   ██║
	╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝
*/

function onConnect(socket, socketId) {
	console.log(`New connection - ${socketId.slice(0, 7)}...`);
	addConnection(socketId);
	updateSocketRoster(socketId, socket);

	// if we have a loaded rom, send it down the line
	transmitRom(socket, socketId);
	// update with the last saved state
	emitTo(socket, SERVER_SEND_INFO, getSocketState(socketId));
}

function bindSocketEvents(socket, socketId) {
	/**
	 * Client has sent a gamestate update from its local emulator.
	 */
	socket.on(CLIENT_SEND_GAME_STATE, (data)=>{
		addIncomingBandwidth(data);

		if (!isPlayerOne(socketId)){
			var playerNum = getPlayerNumber(socketId);
			console.warn(`WARNING: ${socketId} attempted to send state update but is player ${playerNum}`);
			return;
		}

		var state = data.state;
		lastState = Object.assign({}, state);
	});

	/**
	 * Client as joined/left the 'i'd like to play' queue
	 */
	socket.on(CLIENT_JOINED_QUEUE, () => addPlayerToQueue(socketId));
	socket.on(CLIENT_LEFT_QUEUE, () => removePlayerFromQueue(socketId));

	/**
	 * Client has successfully loaded the ROM that was sent to it.
	 */
	socket.on(CLIENT_LOADED_ROM, ()=>{
		if (lastState) {
	  		emitTo(socket, SERVER_SEND_GAME_STATE, lastState, `Emitting ${SERVER_SEND_GAME_STATE}`, true);
		}
	});

	/**
	 * Client requested the ROM binary
	 */
	socket.on(CLIENT_REQUESTED_ROM, ()=>{
		transmitRom(socket, socketId);
	});


	/**
	 * `input:[up|down]` - Socket has reported a player pressed a key locally.
	 * Event is then immediately broadcast to the rest of the sockets.
	 */
	const onJoypadInput = (name) =>
		(button) => {
			addIncomingBandwidth(button);

			if (!isPlayerOne(socketId)){
				return;
			}

			var eventData = {joypadButton: button, player: playerNumber};
	      	emitTo(socket.broadcast, name, eventData, `Emitting ${name}`, true);
		};

	socket.on(CLIENT_SEND_INPUT_DOWN, onJoypadInput(SERVER_SEND_INPUT_DOWN));
	socket.on(CLIENT_SEND_INPUT_UP, onJoypadInput(SERVER_SEND_INPUT_UP));


	/**
	 * Disconnected
	 */
	socket.on('disconnect', ()=>{
		// remove from the audience list
		removeConnection(socketId);
		// remove from the waiting queue
		removePlayerFromQueue(socketId);
		// remove from active players
		removePlayerBySocket(socketId);
	});
}

/*
	███████╗████████╗ █████╗ ████████╗███████╗
	██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝
	███████╗   ██║   ███████║   ██║   █████╗
	╚════██║   ██║   ██╔══██║   ██║   ██╔══╝
	███████║   ██║   ██║  ██║   ██║   ███████╗
	╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝
*/

/**
 * Determines when the current P1 started playing and determines how much
 * time is left in their turn.
 *
 * @return {Number} Time left in current player's turn
 */
function getTurnTimeRemaining() {
	var elapsedTime = timeStart ? (Date.now() - timeStart) : 0;
	var timeLeft = (minsPerTurn * 60) - elapsedTime;
	return playerQueue.length ? timeLeft : 0;
}

function socketToPlayerName(socketId) {
	var playerName;
	if (socketRoster[socketId]) {
		playerName = socketRoster[socketId].name || '[no name]';
	}
	return playerName;
}

function getCurrentPlayerList() {
	return Object.keys(currentPlayers).map((joypad) => currentPlayers[joypad]);
}

function getSocketState(socketId) {
	return {
		session: {
			timeLeft: getTurnTimeRemaining(),
			players: getCurrentPlayerList().map(socketToPlayerName),
		},
		audience: {
			list: connected.map(socketToPlayerName),
			size: connected.length,
		},
		queue: {
			inQueue: playerQueue.indexOf(socketId) !== -1,
			list: playerQueue.map(socketToPlayerName),
			size: playerQueue.length,
			position: playerQueue.indexOf(socketId),
		},
	};
}

function updateAllGameStates() {
	connected.forEach(socketId => {
		emitTo(socketRoster[socketId].socket, SERVER_SEND_INFO, getSocketState(socketId), `Emitting info:update to ${socketId}`);
	});
};

var tickTimer;
var tick = () => {
	var firstPlayer = getPlayerForJoypad(0);

	// if the first player is out of time, just unplug them so someone else can
	// step in
	if (firstPlayer && getTurnTimeRemaining() <= 0){
		unplugJoypad(0);
	}

	// if we don't have a first player but have a playerQueue, plug in
	// the new player to P1
	if (!firstPlayer && playerQueue.length) {
		setPlayer(0, playerQueue[0]);
	}

	firstPlayer && emitTo(firstPlayer, SERVER_REQUEST_CLIENT_GAME_STATE, null, 'Requesting: P1 State');

	updateAllGameStates();

	tickTimer = setTimeout(tick, 1000);
}


/*
	███████╗████████╗ █████╗ ██████╗ ████████╗██╗   ██╗██████╗
	██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██║   ██║██╔══██╗
	███████╗   ██║   ███████║██████╔╝   ██║   ██║   ██║██████╔╝
	╚════██║   ██║   ██╔══██║██╔══██╗   ██║   ██║   ██║██╔═══╝
	███████║   ██║   ██║  ██║██║  ██║   ██║   ╚██████╔╝██║
	╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝
*/

/**
 * Socket.io `connection` event handler. Basically accepts the new socket,
 * determines an id for it, and then binds events/sends initial data.
 */
io.on('connection', (socket) =>{
	var socketId = `${socket.handshake.address}-${socket.id}`;

	bindSocketEvents(socket, socketId);
	onConnect(socket, socketId);
});

// Server kick-off
io.listen(3001);

// This will eventually be removed, but currently on startup the server just spins
// up a ROM and then distributes it to the audience, then begins to `tick`.
loadRom('Super Mario Bros.', path.resolve(__dirname, '../../nES6/app/roms/SuperMarioBros.nes'))
	.then(sendRomToConnected)
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


module.exports = {
	SERVER_SEND_INFO,
	SERVER_SEND_GAME_STATE,
	SERVER_SEND_ROM_BINARY,

	CLIENT_SEND_GAME_STATE,
	CLIENT_JOINED_QUEUE,
	CLIENT_LEFT_QUEUE,
	CLIENT_REQUESTED_ROM,
	CLIENT_LOADED_ROM,
	CLIENT_SEND_INPUT_DOWN,
	CLIENT_SEND_INPUT_UP,

	SERVER_SEND_INPUT_DOWN,
	SERVER_SEND_INPUT_UP,

	SERVER_REQUEST_CLIENT_GAME_STATE,
};
