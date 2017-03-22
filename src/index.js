import React from 'react';
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import {
  BrowserRouter as Router,
  Route,
} from 'react-router-dom';

import reducers from './reducers/'

import App from 'components/App';
// import NotFound from 'components/NotFound';
import Header from 'components/Header';

render(
  <Provider store={createStore(reducers)}>
    <Router>
      <div>
        <Header />
        <Route exact path="/" component={App} />
      </div>
    </Router>
  </Provider>,
  document.getElementById('root')
);