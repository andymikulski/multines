// eslint-disable-next-line
import React from 'react';
import kingHippo from 'assets/king-hippo.gif';
import 'css/kingHippo.css';


const NoServerMessage = (props) =>
  <div className="broken-io">
    <img alt="" src={kingHippo} className="king-hippo" />
    <h3>Oh no!
      <small>Our multiplayer server appears to be down!</small>
      <small>({ props.reason })</small>
    </h3>
    <span>You can still drag-n-drop ROMs onto the page to play single-player, though.</span>
  </div>;

export default NoServerMessage;