const initialState = null;

function socketReducer(state = initialState, action) {
	// console.log('socketReducer', state, action);
  switch (action.type) {
    case 'SET_SOCKET':
    	console.log('setting socket');
      return action.socket;

    default:
      return state;
  }
}

export default socketReducer;
