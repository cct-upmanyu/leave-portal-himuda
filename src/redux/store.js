import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { authApi } from './api/authapi'
import { lookupApi } from './api/lookupApi'
import { holidayApi } from './api/holidayApi'
import { leaveTypeApi } from './api/leaveTypeApi'
import { notificationApi } from './api/notificationApi'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [lookupApi.reducerPath]: lookupApi.reducer,
    [holidayApi.reducerPath]: holidayApi.reducer,
    [leaveTypeApi.reducerPath]: leaveTypeApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      lookupApi.middleware,
      holidayApi.middleware,
      leaveTypeApi.middleware,
      notificationApi.middleware,
    ),
})

setupListeners(store.dispatch)
