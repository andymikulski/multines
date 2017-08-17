// eslint-disable-next-line
import React, { Component } from 'react';
// import { setSocket } from 'actions/socketActions';
import LZString from 'lz-string';

import {
  SERVER_SEND_ROM_BINARY, SERVER_SEND_GAME_STATE, SERVER_SEND_INPUT_DOWN,
  SERVER_SEND_INPUT_UP, SERVER_SEND_INFO, SERVER_REQUEST_CLIENT_GAME_STATE,
  SERVER_PING, CLIENT_PONG, SERVER_CONFIRM_LOBBY_JOIN
} from 'server/constants.js';

export default class NetworkHandler extends Component {
  static serialize(data) {
    return LZString.compressToUTF16(JSON.stringify(data || null));
  };

  static deserialize(data) {
    return JSON.parse(LZString.decompressFromUTF16(data || 'null'));
  };

  componentDidMount() {
    if (this.props.socket) {
      console && console.warn('NetworkHandler : socket already exists');
      return;
    }

    if (!window.io) {
      console && console.warn('NetworkHandler : no socket.io client available');
      if(this.props.onError){
        this.props.onError('No websocket client available.');
      }
      return;
    }

    const io = window.io;
    const socket = io('//multines-server.herokuapp.com/', {
      transports: ['websocket'],
    });

    this.bindSocket(socket);

    this.props.onSocket(socket);
  }

  bindSocket(socket) {
    // For each event, deserialize the data and then trigger the parent handler
    [ 'connect', SERVER_CONFIRM_LOBBY_JOIN, SERVER_SEND_ROM_BINARY, SERVER_SEND_GAME_STATE, SERVER_SEND_INPUT_DOWN,
      SERVER_SEND_INPUT_UP, SERVER_SEND_INFO, SERVER_REQUEST_CLIENT_GAME_STATE
    ].forEach(event => {
      // Bind each event, deserializing received data before firing the prop trigger
      socket.on(event, (rawData)=>{
        const data = NetworkHandler.deserialize(rawData);
        this.props.onEvent(event, data);
      });
    });

    // special ping - pong event that doesn't need to be reported
    socket.on(SERVER_PING, ()=>socket.emit(CLIENT_PONG));
  }

  render() {
    return null;
  }
}
