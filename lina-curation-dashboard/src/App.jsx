import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Crie placeholders para as páginas
const Login = () => <div className="text-white">Página de Login</div>;
const Dashboard = () => <div className="text-white">Dashboard</div>;

function PrivateRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  return session ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <main className="flex-grow">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App
