import React from 'react';

export default class KiwiChat extends React.Component {
  constructor(props){
    super(props);
    this.state = {};
  }

  render() {
    return (
      <iframe
        className={`irc-chat ${this.props.className ? this.props.className : ''}`}
        src="https://kiwiirc.com/client/irc.freenode.com/?&theme=relaxed##multines" />
    );
  }
}
