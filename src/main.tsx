import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './app/App';
import { AuthProvider } from './app/AuthContext';
import { ToastProvider } from './app/ToastContext';
import './styles.css';
import '@xyflow/react/dist/style.css';
import './features/editor/editor.css';
import './styles/api.css';
import './styles/pagination.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);
