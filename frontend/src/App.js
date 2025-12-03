import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import PriceComparison from './pages/PriceComparison';
import AppraisalList from './pages/AppraisalList';
import AppraisalForm from './pages/AppraisalForm';
import AppraisalDetail from './pages/AppraisalDetail';
import MyAppraisals from './pages/MyAppraisals';
import Feedback from './pages/Feedback';
import Moderation from './pages/Moderation';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute roles={['user', 'admin']}>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute roles={['admin']}>
                  <AdminPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/moderation"
              element={
                <PrivateRoute roles={['admin']}>
                  <Moderation />
                </PrivateRoute>
              }
            />
            <Route
              path="/price-comparison"
              element={
                <PrivateRoute roles={['user', 'admin']}>
                  <PriceComparison />
                </PrivateRoute>
              }
            />
            <Route path="/appraisals" element={<AppraisalList />} />
            <Route
              path="/appraisals/new"
              element={
                <PrivateRoute roles={['user', 'admin']}>
                  <AppraisalForm />
                </PrivateRoute>
              }
            />
            <Route path="/appraisals/:id" element={<AppraisalDetail />} />
            <Route
              path="/my-appraisals"
              element={
                <PrivateRoute roles={['user', 'admin']}>
                  <MyAppraisals />
                </PrivateRoute>
              }
            />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
