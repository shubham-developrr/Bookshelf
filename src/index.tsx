import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

/**
 * @description The root element of the application where the React app will be mounted.
 * @type {HTMLElement}
 */
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * @description The root of the React application, created using ReactDOM.createRoot.
 * @type {ReactDOM.Root}
 */
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);