import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Auth Components & Pages
import Login from './pages/Login';
import Register from './pages/Register';
import OtpVerification from './components/OtpVerification';
import RoleSelection from './components/RoleSelection';
import GoogleCallback from "./pages/GoogleCallback";

// Profile Component
import Profile from './components/Profile';

// Core & Public Pages
import Home from "./pages/Home/Home";
import About from './pages/About';
import Contact from './pages/Contact';
import ExploreJobs from './pages/exploreJobs'; 
import JobDetails from './pages/Jobdetails';
import Companies from './pages/Companies';

// Seeker Components & Pages
import CvUploader from './components/CvUploader';
import MatchResults from './pages/MatchResults';
import SeekerDashboard from "./pages/SeekerDashboard";
import CvAnalysis from './components/seeker/CvAnalysis';
import SeekerDocumentation from './pages/SeekerDocumentation';

// Employer Pages
import EmployerDashboard from "./pages/EmployerDashboard";
import CvCheck from './pages/CvCheck';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminApproval from './pages/AdminApproval';

// Shared Pages
import Communication from './pages/Communication';

// Protected Route Guard
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* ========================================== */}
              {/* 1. PUBLIC ROUTES                           */}
              {/* ========================================== */}
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<ExploreJobs />} />
              <Route path="/ExploreJobs" element={<ExploreJobs />} />
              
              <Route path="/job-details/:id" element={<JobDetails />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/companies" element={<Companies />} />

              {/* ========================================== */}
              {/* 2. AUTHENTICATION & ONBOARDING ROUTES      */}
              {/* ========================================== */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<OtpVerification />} />
              
              <Route path="/role-selection" element={<RoleSelection />} />
              <Route path="/select-role" element={<RoleSelection />} />
              
              <Route path="/auth/google/callback" element={<GoogleCallback />} />

              {/* ========================================== */}
              {/* 3. JOB SEEKER PROTECTED ROUTES             */}
              {/* ========================================== */}
              <Route 
                path="/upload-cv" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'user']}>
                    <CvUploader />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/cv-upload" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'user']}>
                    <CvUploader />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seeker-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'user']}>
                    <SeekerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seekerDashboard" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'user']}>
                    <SeekerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'user']}>
                    <SeekerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/match-results" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'user']}>
                    <MatchResults />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/CvAnalysis" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'user']}>
                    <CvAnalysis />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seeker-docs" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'user']}>
                    <SeekerDocumentation />
                  </ProtectedRoute>
                } 
              />

              {/* ========================================== */}
              {/* 4. EMPLOYER PROTECTED ROUTES               */}
              {/* ========================================== */}
              <Route 
                path="/employer-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['employer', 'company', 'recruiter']}>
                    <EmployerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employer/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['employer', 'company', 'recruiter']}>
                    <EmployerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employer-profile" 
                element={
                  <ProtectedRoute allowedRoles={['employer', 'company', 'recruiter']}>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employer-cv-check" 
                element={
                  <ProtectedRoute allowedRoles={['employer', 'company', 'recruiter']}>
                    <CvCheck />
                  </ProtectedRoute>
                } 
              />

              {/* ========================================== */}
              {/* 5. ADMIN PROTECTED ROUTES                  */}
              {/* ========================================== */}
              <Route 
                path="/admin-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin-approval" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminApproval />
                  </ProtectedRoute>
                } 
              />

              {/* ========================================== */}
              {/* 6. SHARED PROTECTED ROUTES                 */}
              {/* ========================================== */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'employer', 'admin', 'user']}>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute allowedRoles={['job_seeker', 'seeker', 'jobseeker', 'employer', 'admin', 'user']}>
                    <Communication />
                  </ProtectedRoute>
                } 
              />

              {/* ========================================== */}
              {/* 7. FALLBACK / 404                          */}
              {/* ========================================== */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;