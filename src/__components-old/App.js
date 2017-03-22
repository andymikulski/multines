import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  Button,
  Dialog,
  Tooltip,
  Intent,
  Popover,
  PopoverInteractionKind,
  Position,
} from '@blueprintjs/core';


import nES6 from '../../../nES6/src/nES6';
import Socket from './Socket';

import logo from '../assets/nes.png';
import kingHippo from '../assets/king-hippo.gif';
import '../css/App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasPlayerOverlay: false,
      hasTechInfo: false,
      hasHelpOverlay: false,

      isPlaying: false,
      romName: null,

      ioBroken: false,
      brokenReason: null,

      isInQueue: false,
      queueNumber: 0,
      totalQueue: 0,
      totalAudience: 0,
      timeLeft: 0,
      isPlayerOne: false,

      socket: null,
    };

    this.togglePlayerOverlay = this.toggleFactory('PlayerOverlay');
    this.toggleTechInfo = this.toggleFactory('TechInfo');
    this.toggleHelpOverlay = this.toggleFactory('HelpOverlay');

    this.handleBrokenSocket = ::this.handleBrokenSocket;
    this.handleSetSocket = ::this.handleSetSocket;
    this.handleRomLoad = ::this.handleRomLoad;
    this.handleDibs = ::this.handleDibs;
    this.handleQueueUpdate = ::this.handleQueueUpdate;
    this.updateTimeLeft = ::this.updateTimeLeft;
  }

  componentWillMount() {
    this.nes = new nES6({
      render: 'headless',
    });
    this.nes.start();
  }

  toggleFactory(prop) {
    const key = `has${prop}`;

    return ()=>{
      this.setState({
        [key]: !this.state[key],
      });
    };
  }

  handleQueueUpdate({ isInQueue, place, total, audience, timeLeft }) {
    this.setState({
      isInQueue,
      isPlayerOne: isInQueue && place === 1,
      queueNumber: place,
      totalQueue: total,
      totalAudience: audience,
      timeLeft,
    });

    if (!!timeLeft && !this.timeLeftTimer) {
      this.timeLeftTimer = setTimeout(this.updateTimeLeft, 1000);
    }
  }

  updateTimeLeft(){
    this.setState({
      timeLeft: this.state.timeLeft > 0 ? this.state.timeLeft - 1 : 0,
    });

    if (this.state.timeLeft > 0) {
      this.timeLeftTimer = setTimeout(this.updateTimeLeft, 1000);
    } else {
      clearTimeout(this.timeLeftTimer);
      this.timeLeftTimer = null;
    }
  }

  handleDibs() {
    const {
      socket,
    } = this.state;

    if (!socket) {
      console && console.warn('No socket!');
      return;
    }

    if (!this.state.isInQueue) {
      socket.emit('queue:join');
    } else {
      socket.emit('queue:leave');
    }
  }

  handleBrokenSocket(reason) {
    this.setState({
      ioBroken: true,
      brokenReason: reason,
    });
  }

  handleRomLoad(romName) {
    this.setState({
      isPlaying: true,
      romName,
    });
  }

  handleSetSocket(socket) {
    this.setState({
      socket
    });
  }

  render() {
    const {
      isInQueue,
      isPlayerOne,
      queueNumber,
      totalQueue,
      totalAudience,
      timeLeft,
      romName,
    } = this.state;

    const dateLeft = new Date(null);
    dateLeft.setSeconds(timeLeft);
    const displayedTime = dateLeft.toISOString().substr(14, 5);

    return (
      <div className="App">
        <nav className="pt-navbar pt-dark">
          <div className="pt-navbar-group pt-align-left">
            <img alt="" src={ logo } className="logo" />
            <div className="pt-navbar-heading">MultiNES
            {
              romName &&
              <small>
                <span className="pt-navbar-divider" />
                {romName}
              </small>
            }
            </div>
          </div>
          {
            !this.state.ioBroken ?
            <div className="pt-navbar-group pt-align-right">
              <Button disabled className="pt-minimal pt-icon-time" text={displayedTime} />
              <Button
                disabled
                className="pt-minimal pt-icon-people"
                text={`${isInQueue ? `${queueNumber} / ` : ''}${totalQueue}`}
              />
              <Button
                disabled
                className="pt-minimal pt-icon-eye-open"
                text={`${totalAudience}`}
              />

              <Popover content={
                <div>
                  {
                    isPlayerOne &&
                    <div>
                      You're currently playing!
                    </div>
                  }
                  { isInQueue && !isPlayerOne ?
                    <div>
                      You are number <b>{ queueNumber }</b> in line.<br /><br />
                      There are <b>{totalQueue}</b> people waiting in line.<br /><br />
                      Your estimated wait time is <b>{(queueNumber - 1) * 2} minutes</b>
                    </div>
                    :
                    <div>
                      There are <b>{totalQueue}</b> people waiting in line.<br /><br />
                      Estimated wait time is <b>{totalQueue * 2} minutes</b>
                    </div>
                  }
                </div>}
                interactionKind={PopoverInteractionKind.HOVER}
                popoverClassName="pt-popover-content-sizing"
                position={Position.BOTTOM_RIGHT.toString()}
                useSmartPositioning={false}>
                  <Button className={`pt-minimal pt-icon-hand ${ isInQueue ? 'pt-active' : ''}`} text={isPlayerOne ? 'NOW PLAYING' : (isInQueue ? 'Leave queue' : 'Get in line')} onClick={this.handleDibs} />
              </Popover>

              <span className="pt-navbar-divider" />
              <Tooltip content={'Player Info'} position={Position.BOTTOM_RIGHT}>
                <Button className="pt-minimal pt-icon-user" onClick={this.togglePlayerOverlay} />
              </Tooltip>

              <Tooltip content={'Help'} position={Position.BOTTOM_RIGHT}>
                <Button className="pt-minimal pt-icon-help" onClick={this.toggleHelpOverlay} />
              </Tooltip>

              <span className="pt-navbar-divider" />

              <Tooltip
                isDisabled={this.state.hasTechInfo}
                content={'Technical Info'}
                position={Position.BOTTOM_RIGHT}>
                  <Popover
                    isOpen={this.state.hasTechInfo}
                    content={<div>This is the stats panel</div>}
                    popoverClassName="pt-popover-content-sizing"
                    position={Position.BOTTOM_RIGHT.toString()}
                    useSmartPositioning={false}>
                      <Button className="pt-minimal pt-icon-info-sign" onClick={this.toggleTechInfo} />
                  </Popover>
              </Tooltip>
            </div>

            :

            <div className="pt-navbar-group pt-align-right">
              <Tooltip content={'Help'} position={Position.BOTTOM_RIGHT}>
                <Button className="pt-minimal pt-icon-help" onClick={this.toggleHelpOverlay} />
              </Tooltip>
            </div>
          }
        </nav>

        {
          this.state.ioBroken && !this.state.isPlaying &&
          <div className="broken-io">
            <img alt="" src={kingHippo} className="king-hippo" />
            <h3>Oh no!
              <small>Our multiplayer server appears to be down!</small>
              <small>({ this.state.brokenReason })</small>
            </h3>
            <span>You can still drag-n-drop ROMs onto the page to play single-player, though.</span>
          </div>
        }

        <Dialog
            iconName="inbox"
            isOpen={this.state.hasPlayerOverlay}
            onClose={this.togglePlayerOverlay}
            title="Player Info"
        >
            <div className="pt-dialog-body">
              <div className="pt-input-group">
                <input type="password" className="pt-input" placeholder="Enter your password..." />
                <Button className="pt-minimal pt-icon-lock" />
              </div>
            </div>
            <div className="pt-dialog-footer">
                <div className="pt-dialog-footer-actions">
                    <Button text="Secondary" />
                    <Button
                      intent={Intent.PRIMARY}
                      onClick={this.togglePlayerOverlay}
                      text="Primary"
                    />
                </div>
            </div>
        </Dialog>
        <Dialog
            iconName="inbox"
            isOpen={this.state.hasHelpOverlay}
            onClose={this.toggleHelpOverlay}
            title="Help"
        >
            <div className="pt-dialog-body">
              <h2>this is a thing</h2>

              <ul>
                <li>Z - B</li>
                <li>X - A</li>
                <li>← - Left</li>
                <li>↑ - Up</li>
                <li>→ - Right</li>
                <li>↓ - Down</li>
              </ul>
            </div>
            <div className="pt-dialog-footer">
                <div className="pt-dialog-footer-actions">
                    <Button
                      intent={Intent.PRIMARY}
                      onClick={this.toggleHelpOverlay}
                      text="oh ok"
                    />
                </div>
            </div>
        </Dialog>
        <Socket
          nes={this.nes}
          isPlayerOne={this.state.isPlayerOne}
          setSocket={this.handleSetSocket}
          onQueueUpdate={this.handleQueueUpdate}
          onRomLoad={this.handleRomLoad}
          onBrokenSocket={this.handleBrokenSocket}
        />
      </div>
    );
  }
}


const mapStateToProps = (state) => ({});

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
