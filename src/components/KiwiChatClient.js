import React from 'react';
import cx from 'classnames';

export default class KiwiChatClient extends React.Component {
  render() {
    const {
      server = 'irc.freenode.com',
      channel = '##multines',
      className,
    } = this.props;

    return (
      <iframe
        className={cx('irc-chat', className)}
        src={`https://kiwiirc.com/client/${server}/?&theme=relaxed${channel}`}
      />
    );
  }
}
