import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App.jsx'
import { store } from './redux/store'
import AuthInitializer from './components/AuthInitializer'
import ToastHost from './components/ToastHost'
import 'primereact/resources/themes/lara-light-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <Router>
        <AuthInitializer>
          <ToastHost />
          <App />
        </AuthInitializer>
      </Router>
    </Provider>
  </StrictMode>,
)
