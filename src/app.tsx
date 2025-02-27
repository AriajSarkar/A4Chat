import React from 'react'
import * as ReactDOM from 'react-dom/client';
import Chat from './components/layout/Chat/Chat';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/global.css';

const App = () => (
  <ThemeProvider>
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Chat />
    </div>
  </ThemeProvider>
);

function render() {
  const root = ReactDOM.createRoot(document.getElementById("app"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

render();
