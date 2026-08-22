import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';

// Layout Components
import Navbar from './components/navbar';
import Footer from './components/Footer';

// Auth Components & Pages
import Login from './pages/login';
import Register from './pages/Register';
import OtpVerification from './components/OtpVerification';
import RoleSelection from './components/RoleSelection';
import GoogleCallback from './pages/GoogleCallback';

// Profile & route guard
import Profile from './components/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import EmployerProfile from './components/employee/EmployerProfile';
import CompanyInfo from './components/employee/CompanyInfo';

// Core & Public Pages
import Home from './pages/home/Home';
import About from './pages/about';
import Contact from './pages/contact';
import ExploreJobs from './pages/ExploreJobs';
import JobDetails from './pages/Jobdetails';
import Companies from './pages/Companies';
import HowItWorks from './pages/HowItWorks';

// Seeker Components & Pages
import PersonalInfo from './components/seeker/PersonalInfo';
import CvUploader from './components/CvUploader';
import MatchResults from './pages/MatchResults';
import SeekerDashboard from './pages/SeekerDashboard';
import SeekerModulePage from './pages/SeekerModulePage';
import CvAnalysis from './components/seeker/CvAnalysis';
import SeekerDocumentation from './pages/Seekerdocumentation';
import ApplicationSubmit from './pages/ApplicationSubmit';

// Employer Pages
import EmployerDashboard from './pages/EmployerDashboard';
import CvCheck from './pages/Cvcheck';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminApproval from './pages/AdminApproval';

// Shared Pages
import Communication from './pages/communication';

function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/') return null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex w-full items-center justify-between px-4 pt-5 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 rounded-xl bg-[#56a2d8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#f0f7fc] hover:text-[#2b73a4] hover:shadow-md"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="flex-grow">
        <BackButton />
            <Routes>
              {/* ========================================== */}
              {/* 1. PUBLIC ROUTES                           */}
              {/* ========================================== */}
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<ExploreJobs />} />
              <Route path="/explore-jobs" element={<ExploreJobs />} />

              <Route path="/job-details/:id" element={<JobDetails />} />
              <Route path="/about" element={<About />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/services" element={<About initialSection="services" />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/find-jobs" element={<ExploreJobs />} />
              <Route path="/company" element={<Companies />} />

              <Route path="/signup" element={<Register />} />
              <Route path="/sign-up" element={<Register />} />

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
              {/* 3. JOB SEEKER / EMPLOYEE PROTECTED ROUTES  */}
              {/* ========================================== */}
              
              {/* አዲስ የተጨመሩት የ Employee Routes */}
              <Route 
                path="/employee-info" 
                element={
                  <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                    <CompanyInfo />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employee-profile-completion" 
                element={
                  <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                    <EmployerProfile />
                  </ProtectedRoute>
                } 
              />

              {/* ነባር የ Seeker Routes */}
              <Route 
                path="/personal-info" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <PersonalInfo />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/personalInfo" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <PersonalInfo />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/upload-cv" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <CvUploader />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/apply/:id"
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <ApplicationSubmit />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/cv-upload" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <CvUploader />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/cv-builder" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <CvUploader />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/seeker-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <SeekerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/ai-matches" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><SeekerModulePage module="matches" /></ProtectedRoute>} />
              <Route path="/saved-jobs" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><SeekerModulePage module="saved" /></ProtectedRoute>} />
              <Route path="/applications" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><SeekerModulePage module="applications" /></ProtectedRoute>} />
              <Route path="/skill-gap" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><SeekerModulePage module="skillgap" /></ProtectedRoute>} />
              <Route path="/interview-prep" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><SeekerModulePage module="interview" /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><SeekerModulePage module="notifications" /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><SeekerModulePage module="settings" /></ProtectedRoute>} />
              <Route 
                path="/seekerDashboard" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <SeekerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <SeekerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/match-results" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <MatchResults />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/career-path" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <MatchResults />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/CvAnalysis" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <CvAnalysis />
                  </ProtectedRoute>
                } 
              />
              <Route path="/cv-analysis" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><CvAnalysis /></ProtectedRoute>} />
              <Route 
                path="/seeker-docs" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
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
                  <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                    <EmployerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employer/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                    <EmployerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employer/candidates" 
                element={
                  <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                    <EmployerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employer/post-job" 
                element={
                  <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                    <EmployerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employer-profile" 
                element={
                  <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employer-cv-check" 
                element={
                  <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
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
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin-approval" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
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
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "employer", "admin", "user", "employee"]}>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile-completion" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "employer", "admin", "user", "employee"]}>
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
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;