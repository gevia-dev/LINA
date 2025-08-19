// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainSidebar from './components/MainSidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import Login from './pages/Login';
import CurationFeed from './pages/CurationFeed';
import LinaExplorerPage from './components/LinaExplorerPage';
import LinaBubbleExplorerPage from './pages/LinaBubbleExplorerPage';
import CurationPageWithCanvas from './components/CurationPageWithCanvas';
import CurationPage from './components/CurationPage';
import ContentTypeSelection from './components/ContentTypeSelection';

// Layout com sidebar
const LayoutWithSidebar = ({ children }) => (
  <div className="layout-with-sidebar" style={{ backgroundColor: '#121212' }}>
    <MainSidebar />
    <div className="layout-content">
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
            <Route path="/explorer" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <LinaExplorerPage />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            <Route path="/bubble-explorer" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <LinaBubbleExplorerPage />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            <Route path="/news/:id" element={<CurationPage />} />
            <Route path="/content-type/:id" element={
              <ProtectedRoute>
                <LayoutWithSidebar>
                  <ContentTypeSelection />
                </LayoutWithSidebar>
              </ProtectedRoute>
            } />
            <Route path="/curation/:id" element={<CurationPage />} />
            <Route path="/" element={<Navigate to="/feed" replace />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
