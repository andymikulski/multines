import React from 'react';
import { connect } from 'react-redux';

import LZString from 'lz-string';
import bindKeyboardPlugin from '../../../nES6/src/plugins/bindKeyboard';
import dragDropLoader from '../../../nES6/src/plugins/dragDropLoader';
import blurPausePlugin from '../../../nES6/src/plugins/blurPausePlugin';


class Socket extends React.Component {

  static serialize(cb) {
    return (data) =>
      cb(LZString.compressToUTF16(JSON.stringify(data)));
  };

  static deserialize(cb) {
    return (data) =>
      cb(JSON.parse(LZString.decompressFromUTF16(data)));
  };

  triggerBrokenSocket(){
    this.props.nes.addPlugins([
      dragDropLoader({
        onRomLoad: ::this.handleSingleRomLoad,
      }),
    ]);

    if (this.props.onBrokenSocket) {
      this.props.onBrokenSocket(`No sockets available to connect to server!`);
    }
  }

  setupSocket() {
    if (!window.io) {
      this.triggerBrokenSocket();
      return;
    }

    const {
      nes,
    } = this.props;

    const io = window.io;
    const socket = io('//localhost:3001/', {
      transports: ['websocket'],
    });

    nes.addPlugins([
      bindKeyboardPlugin({
        onMiddlePress: ({ joypadButton, next }) =>{
          if (this.props.isPlayerOne) {
            socket.emit('input:down', joypadButton);
            next();
          }
        },
        onMiddleDepress: ({ joypadButton, next }) => {
          if (this.props.isPlayerOne) {
            socket.emit('input:up', joypadButton);
            next();
          }
        },
      }),
    ]);
    nes.setRenderer('auto');

    // socket.on('connect', (...data)=>{});
    // socket.on('disconnect', (...data)=>{});

    // incoming
    socket.on('rom:data', Socket.deserialize(({ rom, name })=>{
      nes.loadRomFromBinary(rom.data, name);
      this.props.onRomLoad && this.props.onRomLoad(name);

      socket.emit('rom:loaded');
    }));

    socket.on('state:update', Socket.deserialize(::nes.importState));

    socket.on('input:down', Socket.deserialize(joypadButton =>
      nes.pressControllerButton(0, joypadButton)));

    socket.on('input:up', Socket.deserialize(joypadButton =>
      nes.depressControllerButton(0, joypadButton)));

    socket.on('queue:update', Socket.deserialize(this.props.onQueueUpdate));

    // outgoing
    socket.on('state:request', () => socket.emit('state:update', nes.exportState()));

    this.props.setSocket(socket);

  }

  handleSingleRomLoad(romName) {
    const {
      nes,
    } = this.props;

    this.props.onRomLoad && this.props.onRomLoad(romName);
    // add some plugins to make single-player a little nicer
    nes.addPlugins([
      bindKeyboardPlugin(),
      blurPausePlugin()
    ]);
    nes.setRenderer('auto');
  }

  componentDidMount() {
    this.setupSocket();
  }

  render() {
    return null;
  }
}

const mapStateToProps = (state) => ({
  socket: state.socket,
});

const mapDispatchToProps = (dispatch) => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Socket);
