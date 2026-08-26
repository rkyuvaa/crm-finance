import { configureStore } from '@reduxjs/toolkit';

import { baseApi } from '@/api/baseApi';
import authReducer from '@/auth/authSlice';
import stageFilterReducer from '@/app/stageSlice';

import { rbacApi } from '@/api/rbacApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    stageFilter: stageFilterReducer,
    [baseApi.reducerPath]: baseApi.reducer,
    [rbacApi.reducerPath]: rbacApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, rbacApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
