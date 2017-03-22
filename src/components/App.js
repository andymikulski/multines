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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      networkError: null,
    };

    this.handleNetworkError = ::this.handleNetworkError;
  }

  handleNetworkError(reason) {
    this.setState({
      networkError: reason,
    });

    // set up emulator to allow ROMs + keyboard access
    this.setupSinglePlayer();
  }

  handleNetworkOperation(type, data) {
    switch(type){
      case 'connect':
        this.setupMultiPlayer();
        break;
      default:
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
          socket.emit('input:down', joypadButton);
          next();
        },
        onMiddleDepress: ({ joypadButton, next }) => {
          socket.emit('input:up', joypadButton);
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

        <Emulator ref={(ref)=>{this.emulator = ref && ref.instance;}} />
        <NetworkHandler onError={this.handleNetworkError} />
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
