var fs = require('fs');
var path = require('path');

const utils = require('./utils.js');
var emitTo = utils.emitTo;
var addIncomingBandwidth = utils.addIncomingBandwidth;

var io = require('socket.io')({
	transports: ['websocket'],
});


let currentRom = {};
const loadRom = (name, path)=>{
	return new Promise((resolve, reject) => {
		fs.readFile(path, (err, data) => {
		  if (err) {
		    return reject(err);
		  }

		  console.log(`ROM "${name}" loaded! (${data.toString().length / 1000} KB)`);
		  currentRom = {
		  	name,
		  	data,
		  };
		  resolve(currentRom);
		});
	});
}

const sendIndividualRom = (target, ip)=>{
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
		`Sending ROM data ${!!ip ? `to ${ip}` : ''}`
	);
}

const sendRomToPlayers = ({ name, data })=>{
	const connections = connected || [];

	connections.forEach(ip => {
		const socket = socketRoster[ip].socket;
		if (socket) {
			sendIndividualRom(socket, ip);
		}
	});
};

loadRom('Super Mario Bros.',
	path.resolve(__dirname, '../../nES6/src/roms/SuperMarioBros.nes'))
	.then(sendRomToPlayers);



var playerQueue = [];
var connected = [];
var socketRoster = {};
var playerInfoRoster = {};
var lastState;
var timeStart;

var minsPerTurn = 2;

const getTimeLeft = ()=>{
	const elapsedTime = timeStart ? (Date.now() - timeStart) : 0;
	const timeLeft = (minsPerTurn * 60) - elapsedTime;
	return playerQueue.length ? timeLeft : 0;
};

var getPlaceInfo = ip => ({
	timeLeft: getTimeLeft(),
	isInQueue: playerQueue.indexOf(ip) !== -1,
	place: playerQueue.indexOf(ip) + 1,
	total: playerQueue.length,
	audience: connected.length,
});

const updateAllQueues = ()=>{
	connected.forEach(ip => {
		emitTo(socketRoster[ip].socket, 'queue:update', getPlaceInfo(ip), `Emitting queue:update to ${ip}`);
	});
};

let lastFirstPlayer;
setInterval(()=>{
	if (playerQueue.length > 0){
		let firstPlayer = playerQueue[0];
		let playerSocket = socketRoster[firstPlayer].socket;

		const newFirst = lastFirstPlayer !== firstPlayer;
		lastFirstPlayer = firstPlayer;
		if (newFirst) {
			timeStart = Date.now();
		} else if (getTimeLeft() <= 0) {
			playerSocket = null;
			timeStart = null;
		}

		while (playerQueue.length && (!playerSocket || !playerSocket.connected)) {
			playerQueue.pop();

			firstPlayer = playerQueue[0];
			playerSocket = socketRoster[firstPlayer] && socketRoster[firstPlayer].socket;
			timeStart = Date.now();
		}

		firstPlayer && emitTo(playerSocket, 'state:request', null, 'Requesting: P1 State');
		updateAllQueues();
	}
}, 2500);

setInterval(updateAllQueues, 1000);

io.on('connection', (socket) =>{
	const socketIp = `${socket.handshake.address}-${socket.id}`;
	connected.push(socketIp);
	console.log(`new connection - ${socketIp}`);

	socket.on('disconnect', ()=>{
		const idx = connected.indexOf(socketIp);
		if (idx > -1) {
			connected.splice(idx, 1);
		}

		const playerIndex = playerQueue.indexOf(socketIp);
		if (playerIndex > -1) {
			playerQueue.splice(playerIndex, 1);
		}

		if(lastFirstPlayer === socketIp){
			timeStart = null;
		}

		updateAllQueues();
	});

	socketRoster[socketIp] = Object.assign({}, socketRoster[socketIp]);
	socketRoster[socketIp].socket = socket;

	// when the client emits 'new message', this listens and executes
	socket.on('input:down', (data) => {
		addIncomingBandwidth(data);
      	emitTo(socket.broadcast, 'input:down', data, 'Emitting input:down', true);
	});

	socket.on('input:up', (data) => {
		addIncomingBandwidth(data);
      	emitTo(socket.broadcast, 'input:up', data, 'Emitting input:up', true);
	});

	socket.on('state:update', (state)=>{
		addIncomingBandwidth(state);
		lastState = Object.assign({}, state);

		if (connected.length <= 0) {
			return;
		}

      	emitTo(socket.broadcast, 'state:update', state, 'Emitting state:update', true);
	});

	socket.on('queue:join', ()=>{
		if (playerQueue.indexOf(socketIp) === -1) {
			console.log(`${socketIp} joined the queue`);
			playerQueue.push(socketIp);
			emitTo(socket, 'queue:update', getPlaceInfo(socketIp));
			updateAllQueues();
		}
	});

	socket.on('queue:leave', ()=>{
		const idx = playerQueue.indexOf(socketIp);
		if (idx > -1) {
			console.log(`${socketIp} left the queue`);
			playerQueue.splice(idx, 1);
			updateAllQueues();
		}
	});

	socket.on('queue:status', ()=>{
		emitTo(socket, 'queue:update', getPlaceInfo(socketIp));
	});

	socket.on('rom:loaded', ()=>{
		if (lastState) {
	  		emitTo(socket, 'state:update', lastState, 'Emitting state:update', true);
		}
	});

	// if we have a loaded rom, send it down the line
	sendIndividualRom(socket, socketIp);

	// update with the last saved state
	emitTo(socket, 'queue:update', getPlaceInfo(socketIp));
});

io.listen(3001, ()=>{
	console.log('socket server listening at ws://localhost:3001');
});
