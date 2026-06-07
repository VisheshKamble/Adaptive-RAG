import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* The initial screen visitors see */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Your Adaptive-RAG system dashboard */}
        <Route path="/app" element={<AppPage />} />
      </Routes>
    </Router>
  );
}

export default App;