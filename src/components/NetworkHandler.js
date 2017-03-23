// eslint-disable-next-line
import React, { Component } from 'react';
import { setSocket } from 'actions/socketActions';
import { connect } from 'react-redux';
import LZString from 'lz-string';

import {
  SERVER_SEND_ROM_BINARY, SERVER_SEND_GAME_STATE, SERVER_SEND_INPUT_DOWN,
  SERVER_SEND_INPUT_UP, SERVER_SEND_INFO, SERVER_REQUEST_CLIENT_GAME_STATE
} from '../../server/index.js';

class NetworkHandler extends Component {
  static serialize(cb) {
    return (data) =>
      cb(LZString.compressToUTF16(JSON.stringify(data)));
  };

  static deserialize(cb) {
    return (data) =>
      cb(JSON.parse(LZString.decompressFromUTF16(data)));
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
    const socket = io('//localhost:3001/', {
      transports: ['websocket'],
    });

    this.props.setSocket(socket);
  }

  bindSocket(socket) {
    // For each event, deserialize the data and then trigger the parent handler
    [ 'connect', SERVER_SEND_ROM_BINARY, SERVER_SEND_GAME_STATE, SERVER_SEND_INPUT_DOWN,
      SERVER_SEND_INPUT_UP, SERVER_SEND_INFO, SERVER_REQUEST_CLIENT_GAME_STATE
    ].map(event => socket.on(event, NetworkHandler.deserialize(data => this.props.onEvent(event, data))));
  }

  render() {
    return null;
  }
}

const mapStateToProps = ({ socket }) => ({ socket });
const mapDispatchToProps = (dispatch) => ({ setSocket });

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NetworkHandler);
