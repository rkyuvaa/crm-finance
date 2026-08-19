import { configureStore } from '@reduxjs/toolkit';

import { baseApi } from '@/api/baseApi';
import authReducer from '@/auth/authSlice';
import stageFilterReducer from '@/app/stageSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    stageFilter: stageFilterReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
