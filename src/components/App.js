import React, { Component } from 'react';
import cx from 'classnames';
import { Intent, Position, Toaster } from "@blueprintjs/core";

import 'css/App.css';


import bindKeyboardPlugin from '../../../nES6/src/plugins/bindKeyboard';
import bindGamepadPlugin from '../../../nES6/src/plugins/bindGamepad';
import dragDropLoader from '../../../nES6/src/plugins/dragDropLoader';
// import blurPausePlugin from '../../../nES6/src/plugins/blurPausePlugin';


import NoServerMessage from 'components/NoServerMessage';
import NetworkHandler from 'components/NetworkHandler';
import Emulator from 'components/Emulator';
import Header from 'components/Header';
import LobbyChat from 'components/LobbyChat';

import {
  SERVER_SEND_ROM_BINARY, SERVER_SEND_GAME_STATE, SERVER_SEND_INPUT_DOWN,
  SERVER_SEND_INPUT_UP, SERVER_SEND_INPUT_RESET,
  SERVER_SEND_INFO, SERVER_REQUEST_CLIENT_GAME_STATE,

  CLIENT_SEND_GAME_STATE, CLIENT_REQUESTED_ROM, CLIENT_LOADED_ROM,
  CLIENT_SEND_INPUT_DOWN, CLIENT_SEND_INPUT_UP, CLIENT_REQUEST_LOBBY_JOIN,
  SERVER_CONFIRM_LOBBY_JOIN
} from 'server/constants.js';


export const NotPlayingToaster = Toaster.create({
  className: "not-playing-toast",
  position: Position.BOTTOM_CENTER,
  intent: Intent.primary,
  autoFocus: true,
  canEscapeKeyClear: true,
});

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      networkError: null,
      game: {
        isLoaded: false,
        name: '',
      },
      session: {
        timeLeft: 0,
        players: [],
        // user-specific
        isPlaying: false,
        playerNo: -1,
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
    this.socket = null;

    this.handleNetworkError = ::this.handleNetworkError;
    this.handleNetworkOperation = ::this.handleNetworkOperation;
    this.handleSetSocket = ::this.handleSetSocket;
    this.onSessionTimerTick = ::this.onSessionTimerTick;

    this.lobbyName = location.hash.replace('#', '') || ''; //location.pathname.replace(/(^\/)|(\/$)/g, '') || '';

    // since we have to rely on hashes, we need to treat them as individual page routes,
    // and it's easier to just force hard refreshes than to track which lobby to transfer to etc
    window.onhashchange = function(event){
      // force a hard reload to the new lobby
      location.href = event.newURL;
      location.reload(true);
    };

    this.tickInterval = setInterval(this.onSessionTimerTick, 1000);
  }

  onSessionTimerTick() {
    if (this.state.session.timeLeft > 0) {
      this.setState({
        ...this.state,
        session: {
          ...this.state.session,
          timeLeft: this.state.session.timeLeft - 1000,
        },
      });
    }
  }

  handleSetSocket(socket) {
    this.socket = socket;
  }

  handleNetworkError(reason) {
    this.setState({
      networkError: reason,
    });

    // set up emulator to allow ROMs + keyboard access
    this.setupSinglePlayer();
  }

  joinRemoteLobby(){
    this.socket.emit(CLIENT_REQUEST_LOBBY_JOIN, this.lobbyName);
  }

  handleNetworkOperation(type, data) {
    const socket = this.socket;
    const nes = this.emulator;

    if (!nes || !socket) {
      console.warn(`Received network event "${type}" before ${!!nes ? 'socket' : 'nes'} was available`);
      return;
    }

    switch(type){
      case 'connect':
        this.joinRemoteLobby();
        this.setupMultiPlayer();
        break;
      case SERVER_CONFIRM_LOBBY_JOIN:
        socket.emit(CLIENT_REQUESTED_ROM);
        break;
      case SERVER_SEND_ROM_BINARY:
        nes.loadRomFromBinary(data.rom.data, data.name);

        this.setState({
          ...this.state,
          game: {
            ...this.state.game,
            isLoaded: true,
            name: data.name,
          },
        });

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
      case SERVER_SEND_INPUT_RESET:
        for(let joypadIndex = 0; joypadIndex < 8; joypadIndex++){
          nes.depressControllerButton(0, joypadIndex);
          nes.depressControllerButton(1, joypadIndex);
        }
        break;
      case SERVER_SEND_INFO:
        this.setState({
          ...this.state,
          game: {
            ...this.state.game,
            ...data.game,
          },
          session: {
            ...this.state.session,
            ...data.session,
          },
          audience: {
            ...this.state.audience,
            ...data.audience,
          },
          queue: {
            ...this.state.queue,
            ...data.queue,
          },
        });

        // reset the timer so that it ticks down from the latest time
        // the server sent (prevents the time changing every half second)
        clearInterval(this.tickInterval);
        this.tickInterval = setInterval(this.onSessionTimerTick, 1000);
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
      dragDropLoader({
        onRomLoad: (name)=>{
          this.setState({
            ...this.state,
            game: {
              ...this.state.game,
              isLoaded: true,
              name,
            },
          });
          // enable the renderer only once the user has loaded a ROM
          nes.setRenderer('auto');
        }
      }),
    ]);
  }

  showNotPlayingToast() {
    const toasts = NotPlayingToaster.getToasts();

    if (toasts.length){
      return;
    }

    NotPlayingToaster.show({
      icon: 'warning',
      message: `You're not currently playing! You should get in line if you're interested in joining.`,
      timeout: 2500,
    });
  }

  setupMultiPlayer() {
    const nes = this.emulator;
    if (!nes) {
      return;
    }

    // For multiplayer we need to intercept the key presses to determine
    // if the user is actually currently playing or not.
    const keyMiddleware = (event) =>
      ({ joypadButton, next }) => {
        if (this.state.session.playerNo < 0 && !this.state.queue.inQueue){
          this.showNotPlayingToast();
          return;
        }

        if (this.state.session.isPlaying) {
          this.socket.emit(event, joypadButton);
          // calling `next` will apply the keypress to the local emulator
          next();
        }
      };

    nes.addPlugins([
      bindKeyboardPlugin({
        onInterruptedPress: keyMiddleware(CLIENT_SEND_INPUT_DOWN),
        onInterruptedDepress: keyMiddleware(CLIENT_SEND_INPUT_UP),
      }),
    ]);
    nes.setRenderer('auto');
  }

  render() {
    return (
      <div className="App">
        <Header
          networkError={this.state.networkError}
          session={this.state.session}
          audience={this.state.audience}
          queue={this.state.queue}
          game={this.state.game}
          socket={this.socket}
          lobby={this.lobbyName}
        />
        {
          this.state.networkError && !this.state.game.isLoaded &&
          <NoServerMessage reason={this.state.networkError} />
        }

        <Emulator ref={(emu)=>{this.emulator = emu && emu.instance;}} />
        <LobbyChat
          lobby={this.lobbyName}
          className={cx(this.state.game.isLoaded && 'has-game')}
        />
        <NetworkHandler
          onSocket={this.handleSetSocket}
          onEvent={this.handleNetworkOperation}
          onError={this.handleNetworkError}
        />
      </div>
    );
  }
}
