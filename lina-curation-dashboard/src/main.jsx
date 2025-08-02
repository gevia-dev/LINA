// src/main.jsx

console.log('Variáveis de ambiente carregadas pelo Vite:', import.meta.env); // Adicione esta linha

import React from 'react';
import ReactDOM from 'react-dom/client';
// ... o resto do seu código
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
