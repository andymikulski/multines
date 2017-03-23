import React, { Component } from 'react';
import { connect } from 'react-redux';
import 'css/App.css';


import bindKeyboardPlugin from '../../../nES6/src/plugins/bindKeyboard';
import bindGamepadPlugin from '../../../nES6/src/plugins/bindGamepad';
import dragDropLoader from '../../../nES6/src/plugins/dragDropLoader';
import blurPausePlugin from '../../../nES6/src/plugins/blurPausePlugin';


import NoServerMessage from 'components/NoServerMessage';
import NetworkHandler from 'components/NetworkHandler';
import Emulator from 'components/Emulator';

import {
  SERVER_SEND_ROM_BINARY, SERVER_SEND_GAME_STATE, SERVER_SEND_INPUT_DOWN,
  SERVER_SEND_INPUT_UP, SERVER_SEND_INFO, SERVER_REQUEST_CLIENT_GAME_STATE,

  CLIENT_SEND_GAME_STATE, CLIENT_LOADED_ROM, CLIENT_SEND_INPUT_DOWN, CLIENT_SEND_INPUT_UP,
} from '../../server/constants.js';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      networkError: null,
      session: {
        timeLeft: 0,
        players: [],
      },
      audience: {
        list: [],
        size: 0,
      },
      queue: {
        inQueue: false,
        list: [],
        size: 0,
        position: -1,
      },
    };

    this.handleNetworkError = ::this.handleNetworkError;
    this.handleNetworkOperation = ::this.handleNetworkOperation;
  }

  handleNetworkError(reason) {
    this.setState({
      networkError: reason,
    });

    // set up emulator to allow ROMs + keyboard access
    this.setupSinglePlayer();
  }

  handleNetworkOperation(type, data) {
    const { socket } = this.props;
    const nes = this.emulator;
    if (!nes) {
      console.warn(`Received network event "${type}" before emulator was available`);
      return;
    }

    switch(type){
      case 'connect':
        this.setupMultiPlayer();
        break;
      case SERVER_SEND_ROM_BINARY:
        nes.loadRomFromBinary(data.rom, data.name);

        socket.emit(CLIENT_LOADED_ROM);
        break;
      case SERVER_SEND_GAME_STATE:
        nes.importState(data);
        break;
      case SERVER_SEND_INPUT_DOWN:
        nes.pressControllerButton(data.player, data.joypadButton);
        break;
      case SERVER_SEND_INPUT_UP:
        nes.depressControllerButton(data.player, data.joypadButton);
        break;
      case SERVER_SEND_INFO:
        this.setState({
          ...this.state,
          ...data,
        });
        break;
      case SERVER_REQUEST_CLIENT_GAME_STATE:
        socket.emit(CLIENT_SEND_GAME_STATE, nes.exportState());
        break;
      default:
        console.warn(`Unknown network event "${type}" received`);
        break;
    }
  }

  setupSinglePlayer() {
    const nes = this.emulator;
    if (!nes) {
      return;
    }

    nes.addPlugins([
      bindKeyboardPlugin(),
      bindGamepadPlugin(),
      blurPausePlugin(),
      dragDropLoader({
        onRomLoad: ()=>{
          // enable the renderer only once the user has loaded a ROM
          nes.setRenderer('auto');
        }
      }),
    ]);
  }

  setupMultiPlayer() {
    const nes = this.emulator;
    if (!nes) {
      return;
    }
    const {
      socket,
    } = this.props;

    nes.addPlugins([
      bindKeyboardPlugin({
        onMiddlePress: ({ joypadButton, next }) =>{
          socket.emit(CLIENT_SEND_INPUT_DOWN, joypadButton);
          next();
        },
        onMiddleDepress: ({ joypadButton, next }) => {
          socket.emit(CLIENT_SEND_INPUT_UP, joypadButton);
          next();
        },
      }),
    ]);
    nes.setRenderer('auto');
  }

  render() {
    return (
      <div className="App">
        {
          this.state.networkError &&
          <NoServerMessage reason={this.state.networkError} />
        }

        <Emulator ref={(emu)=>{this.emulator = emu && emu.instance;}} />
        <NetworkHandler
          onEvent={this.handleNetworkOperation}
          onError={this.handleNetworkError}
        />
      </div>
    );
  }
}


const mapStateToProps = ({ socket }) => ({ socket });

const mapDispatchToProps = (dispatch) => {
  return {
    wooFunc: () => {
      dispatch(()=>{});
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);
