// eslint-disable-next-line
import React, { Component } from 'react';
import nES6 from 'nES6';

export default class Emulator extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.instance = new nES6({
      render: 'headless',
    });
    this.instance.start();
  }

  render() {
    return null;
  }
}
