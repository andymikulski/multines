import { combineReducers } from 'redux';
// import { routerReducer } from 'react-router-redux';

import socket from './socketReducer';

export default combineReducers({
  socket,
});
