import React, { Component } from 'react';
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

export default class Header extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const isInQueue = false;
    const ioBroken = false;
    const isPlayerOne = false;
    const queueNumber = 4;
    const totalQueue = 10;
    const totalAudience = 15;
    const displayedTime = '1:43';

    return (
      <nav className="pt-navbar pt-dark">
        <div className="pt-navbar-group pt-align-left">
          <img alt="" src={ logo } className="logo" />
          <div className="pt-navbar-heading">
            {'MultiNES'}
            <small>
              <span className="pt-navbar-divider" />
              Super Mario Bros.
            </small>
          </div>
        </div>
        {
          !ioBroken &&
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
        }
        <div className="pt-navbar-group pt-align-right">
          <Tooltip content={'Help'} position={Position.BOTTOM_RIGHT}>
            <Button className="pt-minimal pt-icon-help" onClick={this.toggleHelpOverlay} />
          </Tooltip>
        </div>
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
      </nav>
    );
  }
}
