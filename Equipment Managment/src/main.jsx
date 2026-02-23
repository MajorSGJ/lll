import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Extract oh_token from URL if passed by OneHost and save to localStorage
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get('oh_token');
if (tokenFromUrl) {
  localStorage.setItem('oh_token', tokenFromUrl);
  // Clean token from URL without reload
  urlParams.delete('oh_token');
  const cleanUrl = urlParams.toString()
    ? `${window.location.pathname}?${urlParams.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, '', cleanUrl);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
