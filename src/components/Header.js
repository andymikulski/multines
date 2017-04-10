import React, { Component } from 'react';
import cx from 'classnames';
import logo from 'assets/nes.png';
import 'css/Header.css';

import {
  Button,
  Dialog,
  Tooltip,
  Intent,
  Popover,
  PopoverInteractionKind,
  Position,
} from '@blueprintjs/core';

import {
  CLIENT_JOINED_QUEUE,
  CLIENT_LEFT_QUEUE,
  CLIENT_UNPLUGGED,
} from 'server/constants.js';


export default class Header extends Component {
  static formatTimeToHumanReadable(durationMs) {
    const seconds = parseInt((durationMs/1000)%60, 10);
    const minutes = parseInt((durationMs/(1000*60))%60, 10);
    const hours = parseInt((durationMs/(1000*60*60))%24, 10);

    const strHours = (hours < 10) ? `0${hours}` : hours;
    const strMinutes = (hours && minutes < 10) ? `0${minutes}` : minutes;
    const strSeconds = (seconds < 10) ? `0${seconds}` : seconds;

    return `${hours ? `${strHours}:` : ''}${strMinutes}:${strSeconds}`;
  }

  constructor(props) {
    super(props);
    this.state = {
      hasTechInfo: false,
      hasPlayerOverlay: false,
      hasHelpOverlay: false,
    };

    this.toggleHelpOverlay = ::this.toggleHelpOverlay;
    this.toggleTechInfo = ::this.toggleTechInfo;
    this.togglePlayerOverlay = ::this.togglePlayerOverlay;
    this.handleQueueChange = ::this.handleQueueChange;
    this.handleLobbyChange = ::this.handleLobbyChange;
  }

  toggleHelpOverlay () {
    this.setState({
      hasHelpOverlay: !this.state.hasHelpOverlay,
    });
  }

  toggleTechInfo () {
    this.setState({
      hasTechInfo: !this.state.hasTechInfo,
    });
  }

  togglePlayerOverlay() {
    this.setState({
      hasPlayerOverlay: !this.state.hasPlayerOverlay,
    });
  }

  handleLobbyChange() {
    const newLobby = window.prompt('Enter lobby name to join');
    if (newLobby) {
      location.hash = newLobby;
    }
  }

  handleQueueChange() {
    const {
      session,
      socket,
      queue,
    } = this.props;

    const isPlayerOne = session.playerNo === 0;
    const displayedTime = Header.formatTimeToHumanReadable(session.timeLeft || 0);

    if (isPlayerOne){
      if(window.confirm(`You have ${displayedTime} left to play. Are you sure you want to pass the controller?`)){
        socket.emit(CLIENT_UNPLUGGED);
      }

      return;
    }

    if (queue.inQueue) {
      socket.emit(CLIENT_LEFT_QUEUE);
    } else {
      socket.emit(CLIENT_JOINED_QUEUE);
    }
  }

  render() {
    const {
      networkError,
      session,
      game,
      audience,
      queue,
      lobby,
      socket,
    } = this.props;

    const isInQueue = queue.inQueue;
    const isIoBroken = !!networkError;
    const isPlayerOne = session.playerNo === 0;
    const queueNumber = queue.position + 1;
    const totalQueue = queue.size;
    const totalAudience = audience.size;

    const seshTimeLeft = session.timeLeft || 0;
    const displayedTime = Header.formatTimeToHumanReadable(seshTimeLeft);
    const secondsLeft = seshTimeLeft / 1000;
    const isPlaytimeLow = seshTimeLeft > 0 && isPlayerOne && secondsLeft <= 30;

    return (
      <nav className="pt-navbar pt-dark">
        <div className="pt-navbar-group pt-align-left">
          <img alt="" src={ logo } className="logo" />
          <div className="pt-navbar-heading">
            <span className="logo-title">MultiNES</span>
            <small>
              <span className="pt-navbar-divider" />
              <Button className="pt-minimal pt-small" onClick={this.handleLobbyChange}>
                Lobby: <b>{ lobby || 'Main' }</b>
              </Button>
              <span className="pt-navbar-divider" />
              <Button className="pt-minimal pt-small no-interaction">
                { game.name }
              </Button>
            </small>
          </div>
        </div>
        {
          !isIoBroken && !!socket &&
          <div className="pt-navbar-group pt-align-right">
            <span className="pt-navbar-divider" />
            <Button className={cx('no-interaction', 'pt-minimal', 'pt-icon-time', isPlaytimeLow && 'warning')} text={displayedTime} title={'Time Left'} />
            <Button
              className="no-interaction pt-minimal pt-icon-people"
              text={`${isInQueue ? `${queueNumber} / ` : ''}${totalQueue}`}
              title={isInQueue ? `You're number ${queueNumber} of ${totalQueue}` : `${totalQueue} ${totalQueue === 1 ? 'person is' : 'people are'} in line`}
            />
            <Button
              className="no-interaction pt-minimal pt-icon-eye-open"
              text={`${totalAudience}`}
              title={`${totalAudience} ${totalAudience === 1 ? 'person' : 'people'} watching`}
            />
            <span className="pt-navbar-divider" />

            <Popover content={
              <div>
                {
                  isPlayerOne &&
                  <h2>
                    You're currently playing!
                  </h2>
                }
                { isInQueue && !isPlayerOne ?
                  <div>
                    You are number <b>{ queueNumber }</b> in line.<br /><br />
                    There are <b>{totalQueue}</b> people waiting in line.<br /><br />
                    Your estimated wait time is <b>{(queueNumber - 1) * 2} minutes</b>
                  </div>
                  :
                  <div>
                    { totalQueue > 0 ?
                      <div>
                        There are <b>{totalQueue}</b> people waiting in line.<br /><br />
                        Estimated wait time is <b>{totalQueue * 2} minutes</b>
                      </div>
                      :
                      <div>
                        There is <b>NO LINE</b>! { !isPlayerOne ? 'Click to start playing!' : 'Your turn will continue until someone else wants to play.' }
                      </div>
                    }
                  </div>
                }
              </div>}
              interactionKind={PopoverInteractionKind.HOVER}
              popoverClassName="pt-popover-content-sizing"
              position={Position.BOTTOM_RIGHT.toString()}
              useSmartPositioning={false}>
                <Button
                  className={cx('pt-minimal', isPlayerOne ? 'pt-icon-star' : 'pt-icon-hand', isInQueue && 'pt-active', isPlayerOne && 'now-playing')}
                  text={isPlayerOne ? 'NOW PLAYING' : (isInQueue ? 'Leave queue' : 'Get in line')}
                  onClick={this.handleQueueChange} />
            </Popover>
          </div>
        }

        <div className="pt-navbar-group pt-align-right">
          <Tooltip content={'Help'} position={Position.BOTTOM_RIGHT}>
            <Button className="pt-minimal pt-icon-help" onClick={this.toggleHelpOverlay} />
          </Tooltip>
        </div>

        <Dialog
            iconName="help"
            isOpen={this.state.hasHelpOverlay}
            onClose={this.toggleHelpOverlay}
            title="Help"
        >
            <div className="pt-dialog-body">
              <h2>MultiNES Help Guide</h2>

              <hr />

              <h4>Controls</h4>
              <ul>
                <li><b>D-Pad</b> - Arrow Keys (←↑→↓)</li>
                <li><b>START</b> - Enter</li>
                <li><b>SELECT</b> - C</li>
                <li><b>B Button</b> - Z</li>
                <li><b>A Button</b> - X</li>
              </ul>

              <div style={{
                background: 'rgba(0,0,0,0.051)',
                padding: '1em',
                borderRadius: '4px',
              }}>
                <b>Controls not working at all?</b>
                <div>It's probably not your turn to play! Click <b>"GET IN LINE"</b> on the top of the page to start playing.</div>
              </div>

              <hr />

              <h4>Laggy? Glitchy?</h4>
              <div>
                <p>Yep, that'll happen, sorry! Our servers do their best to keep everyone in sync, though if you're just watching (and not actively playing), it's likely that the game will appear choppy or glitchy.</p>
                <p>We're actively working to smooth things out, so please bear with us as we improve the site. Thank you for your patience!</p>
              </div>

              <hr />

              <h4>It's all one player games!</h4>
              <div>
                <p>Two-player support is coming soon!</p>
              </div>

              <hr />

              <h6>Credit</h6>
              <div>
                <p>MultiNES was developed by <a href="mailto:andy.mikulski+multines@gmail.com">Andy Mikulski</a> using <a href="https://github.com/andymikulski/nES6/tree/develop" target="_blank">nES6</a>.</p>
              </div>

            </div>
            <div className="pt-dialog-footer">
                <div className="pt-dialog-footer-actions">
                    <Button
                      intent={Intent.PRIMARY}
                      onClick={this.toggleHelpOverlay}
                      text="Close"
                    />
                </div>
            </div>
        </Dialog>
      </nav>
    );
  }
}
