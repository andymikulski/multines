var LZString = require('lz-string');
var sizeof = require('object-sizeof');
var md5 = require('md5');
var fs = require('fs');

var serialize = function(obj) {
	return LZString.compressToUTF16(JSON.stringify(obj));
};

var deserialize = function(str) {
	return JSON.parse(LZString.decompressFromUTF16(str));
};

// Logging stuff
var sentBandwidth = 0;
var receivedBandwidth = 0;

var emitTo = (socket, action, data, summary, broadcast) => {
	if (!socket || !socket.emit) {
		if (socket && !socket.emit) {
			console && console.warn('socket doesnt have an emit - ', action);
		} else if (!socket ){
			console && console.warn('no socket given for action - ', action);
		}
		return;
	}

	const compressedData = serialize(data);
// 	const originalSize = (sizeof(data) + sizeof(action)) / 1000;
// 	const outgoingSize = (sizeof(compressedData) + sizeof(action)) / 1000;
// 	const audienceSize = broadcast ? getNumClients() - 1 : 1;
// 	sentBandwidth += outgoingSize;

	// console.log(`\t${summary || `Emitting "${action}"`}`);
// TOTAL INBOUND: ${receivedBandwidth.toFixed(2)} KB
// TOTAL OUTBOUND: ${sentBandwidth.toFixed(2)} KB
// `);

	socket.emit(action, compressedData);
};

var addIncomingBandwidth = (data) =>{
	receivedBandwidth += sizeof(data) / 1000;
};

const loadRom = (name, path) => {
	return new Promise((resolve, reject) =>
		fs.readFile(path, (err, data) => {
			if (err) {
				return reject(err);
			}
			resolve({ name, data });
		})
	);
}

module.exports = {
	serialize,
	deserialize,
	emitTo,
	addIncomingBandwidth,
	loadRom,
};