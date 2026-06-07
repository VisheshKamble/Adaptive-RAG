import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar'; // ← add
import LandingPage from './pages/LandingPage';
import AppPage from './pages/AppPage';

function App() {
  return (
    <Router>

      <Navbar /> {/* ← render navbar */}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppPage />} />
      </Routes>

    </Router>
  );
}

export default App;