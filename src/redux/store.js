import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { authApi } from './api/authapi'
import { employeeApi } from './api/employeeApi'
import { holidayApi } from './api/holidayApi'
import { leaveApi } from './api/leaveApi'
import { leaveTypeApi } from './api/leaveTypeApi'
import { lookupApi } from './api/lookupApi'
import { notificationApi } from './api/notificationApi'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [employeeApi.reducerPath]: employeeApi.reducer,
    [holidayApi.reducerPath]: holidayApi.reducer,
    [leaveApi.reducerPath]: leaveApi.reducer,
    [leaveTypeApi.reducerPath]: leaveTypeApi.reducer,
    [lookupApi.reducerPath]: lookupApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      employeeApi.middleware,
      holidayApi.middleware,
      leaveApi.middleware,
      leaveTypeApi.middleware,
      lookupApi.middleware,
      notificationApi.middleware,
    ),
})

setupListeners(store.dispatch)
