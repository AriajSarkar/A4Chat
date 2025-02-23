import React from 'react'
import * as ReactDOM from 'react-dom/client';
import Chat from './components/features/Chat';
import './styles/global.css';  // Add this import

const App = () => (
  <div className="min-h-screen bg-gray-100">
    <Chat />
  </div>
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
