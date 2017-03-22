const initialState = null;

function socketReducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_SOCKET':
      return action.socket;

    default:
      return state;
  }
}

export default socketReducer;
