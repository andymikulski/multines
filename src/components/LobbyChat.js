import React from 'react';
import cx from 'classnames';
import KiwiChatClient from 'components/KiwiChatClient';

export default class LobbyChat extends React.Component {
  render() {
    const {
      lobby = '',
      className,
    } = this.props;

    // default to ##multines, but if we have a lobby name, append it
    // e.g. ##multiness-woo-test-lobby
    const channel = `##multines${lobby ? `-${lobby}` : ''}`;

    return (
      <KiwiChatClient
        className={cx(className)}
        channel={channel}
      />
    );
  }
}
