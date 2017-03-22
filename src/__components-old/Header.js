import React, { Component } from 'react';
import logo from '../assets/logo.svg';

export default class Header extends Component {
  render() {
    return (
      <nav className="pt-navbar pt-dark">
        <div className="pt-navbar-group pt-align-left">
          <img role="presentation" src={ logo } className="logo" />
          <div className="pt-navbar-heading">
            {'MultiNES'}
            <small>
              <span className="pt-navbar-divider" />
              Super Mario Bros.
            </small>
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
    );
  }
}
