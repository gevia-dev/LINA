// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainSidebar from './components/MainSidebar';

// Páginas
import Login from './pages/Login';
import CurationFeed from './pages/CurationFeed.jsx';
import CurationPage from './components/CurationPage.jsx';
import LinaExplorerPage from './components/LinaExplorerPage.jsx';
import LinaBubbleExplorerPage from './pages/LinaBubbleExplorerPage.jsx'; // Importe a nova página

// Componentes placeholder
const UploadPage = () => <div className="text-white">Página de Upload</div>;

// Layout com sidebar
const LayoutWithSidebar = ({ children }) => (
  <div className="w-full h-screen flex" style={{ backgroundColor: '#121212' }}>
    <div className="w-48 flex-shrink-0">
      <MainSidebar />
    </div>
    <div className="flex-1">
      {children}
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <main className="flex-grow">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/feed" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <CurationFeed />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            <Route path="/news/:id" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <CurationPage />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            <Route path="/curation" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <CurationPage />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            <Route path="/explorer" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <LinaExplorerPage />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            {/* Adicione a nova rota */}
            <Route path="/bubble-explorer" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <LinaBubbleExplorerPage />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            <Route path="/upload" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <UploadPage />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="*" element={<Navigate to="/feed" />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
