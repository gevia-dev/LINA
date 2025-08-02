import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importe a nova página de feed
import CurationFeed from './pages/CurationFeed.jsx';
import CurationPage from './components/CurationPage.jsx';

// Componentes placeholder
const Dashboard = () => <div className="text-white">Dashboard Principal</div>;

function App() {
  return (
    <Router>
      <main className="flex-grow">
        <Routes>
          <Route path="/feed" element={<CurationFeed />} /> {/* Rota para o feed */}
          <Route path="/curation" element={<CurationPage />} /> {/* Rota para a página de curadoria */}
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/feed" />} /> {/* Redireciona para o feed como padrão */}
        </Routes>
      </main>
    </Router>
  );
}

export default App
