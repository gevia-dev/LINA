import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import Login from './pages/Login';
import CurationFeed from './pages/CurationFeed.jsx';
import CurationPage from './components/CurationPage.jsx';

// Componentes placeholder
const Dashboard = () => <div className="text-white">Dashboard Principal</div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <main className="flex-grow">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/feed" element={
              <ProtectedRoute>
                <CurationFeed />
              </ProtectedRoute>
            } />
            <Route path="/news/:id" element={
              <ProtectedRoute>
                <CurationPage />
              </ProtectedRoute>
            } />
            <Route path="/curation" element={
              <ProtectedRoute>
                <CurationPage />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/feed" />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App
