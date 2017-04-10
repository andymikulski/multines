module.exports = {
	SERVER_SEND_INFO: 'server:info:send',
	SERVER_SEND_ROM_BINARY: 'server:rom:send',

	CLIENT_SEND_GAME_STATE: 'client:state:send',
	CLIENT_JOINED_QUEUE: 'client:queue:join',
	CLIENT_LEFT_QUEUE: 'client:queue:leave',
	CLIENT_REQUESTED_ROM: 'client:rom:request',
	CLIENT_LOADED_ROM: 'client:rom:load',
	CLIENT_SEND_INPUT_DOWN: 'client:input:down',
	CLIENT_SEND_INPUT_UP: 'client:input:up',
	CLIENT_UNPLUGGED: 'client:unplugged',

	CLIENT_REQUEST_LOBBY_JOIN: 'client:lobby:join',
	SERVER_CONFIRM_LOBBY_JOIN: 'server:lobby:join:confirm',

	SERVER_SEND_INPUT_DOWN: 'server:input:down',
	SERVER_SEND_INPUT_UP: 'server:input:up',
	SERVER_SEND_INPUT_RESET: 'server:input:reset',

	SERVER_REQUEST_CLIENT_GAME_STATE: 'server:state:request',
	SERVER_SEND_GAME_STATE: 'server:state:send',

	SERVER_PING: 'server:ping',
	CLIENT_PONG: 'client:pong',
};
