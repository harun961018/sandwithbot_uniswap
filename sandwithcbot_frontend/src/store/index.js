import { configureStore } from '@reduxjs/toolkit'
import appReducer from './reducers/app-slice';

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
});
