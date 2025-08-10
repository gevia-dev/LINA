// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainSidebar from './components/MainSidebar';

// Páginas
import Login from './pages/Login';
import CurationFeed from './pages/CurationFeed';

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
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="*" element={<Navigate to="/feed" />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
