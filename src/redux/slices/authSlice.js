import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  status: 'idle',
  forcedLogout: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
      state.status = 'authenticated'
      state.forcedLogout = false
    },
    clearUser: (state) => {
      state.user = null
      state.status = 'unauthenticated'
    },
    setAuthLoading: (state) => {
      state.status = 'loading'
    },
    setForcedLogout: (state) => {
      state.forcedLogout = true
      state.user = null
      state.status = 'unauthenticated'
    },
    clearForcedLogout: (state) => {
      state.forcedLogout = false
    },
  },
})

export const {
  setUser,
  clearUser,
  setAuthLoading,
  setForcedLogout,
  clearForcedLogout,
} = authSlice.actions
export default authSlice.reducer
