import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import JobDetailsPage from './pages/JobDetails';
import ApplyJob from './pages/ApplyJob';
import Companies from './pages/Companies';
import CompanyCommunity from './pages/CompanyCommunity';
import HowItWorks from './pages/HowItWorks';

// Seeker Components & Pages
import CvUploader from './components/CvUploader';
import CvUploadScreen from './components/CvUploadScreen';
import UpdateCV from './pages/UpdateCV';
import MatchResults from './pages/MatchResults';
import JobSeekerDashboard from './pages/JobSeekerDashboard';
import MyResume from './pages/MyResume';
import ResumePreview from './pages/ResumePreview';
import MyProfile from './pages/MyProfile';
import EditProfile from './pages/EditProfile';
import CertificatePreview from './pages/CertificatePreview';
import MyApplications from './pages/MyApplications';
import ApplicationDetails from './pages/ApplicationDetails';
import InterviewDetails from './pages/InterviewDetails';
import SeekerModulePage from './pages/SeekerModulePage';
import SeekerDocumentation from './pages/Seekerdocumentation';

// Employer Pages
import EmployerWorkspace from './pages/EmployerWorkspace';
import DashboardOverview from './pages/DashboardOverview';
import CvCheck from './pages/Cvcheck';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminApproval from './pages/AdminApproval';

// Shared Pages
import Communication from './pages/communication';
import SeekerPageLayout from './components/SeekerPageLayout';

const withSeekerSidebar = (page) => <SeekerPageLayout>{page}</SeekerPageLayout>;

function AppLayout() {
  const location = useLocation();
  const dashboardRoutes = [
    '/dashboard',
    '/seeker-dashboard',
    '/seekerDashboard',
    '/employer-dashboard',
    '/employer/dashboard',
    '/employer/candidates',
    '/employer/post-job'
  ];
  const isDashboardRoute = dashboardRoutes.includes(location.pathname);
  const publicRoutes = [
    '/', '/jobs', '/explore-jobs', '/about', '/how-it-works', '/services',
    '/contact', '/companies', '/find-jobs', '/company', '/login', '/register',
    '/signup', '/sign-up', '/verify-otp', '/role-selection', '/select-role',
  ];
  const isPublicRoute = publicRoutes.includes(location.pathname) ||
    ['/job-details/', '/jobs/', '/apply/', '/companies/'].some((prefix) => location.pathname.startsWith(prefix));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          {/* ========================================== */}
          {/* 1. PUBLIC ROUTES                           */}
          {/* ========================================== */}
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<ExploreJobs />} />
          <Route path="/explore-jobs" element={<ExploreJobs />} />

          <Route path="/job-details/:id" element={<JobDetailsPage />} />
          <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/jobs/:id/apply" element={<ApplyJob />} />
          <Route path="/apply/:id" element={<ApplyJob />} />
          <Route path="/about" element={<About initialSection="about" />} />
          <Route path="/about/overview" element={<About initialSection="overview" />} />
          <Route path="/about/experience" element={<About initialSection="experience" />} />
          <Route path="/about/skills" element={<About initialSection="skills" />} />
          <Route path="/about/projects" element={<About initialSection="projects" />} />
          <Route path="/about/services" element={<About initialSection="services" />} />
          <Route path="/about/jobs" element={<About initialSection="jobs" />} />
          <Route path="/about/prompts" element={<About initialSection="prompts" />} />
          <Route path="/about/contact" element={<About initialSection="contact" />} />
          <Route path="/about/create-profile" element={<About initialSection="create-profile" />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/services" element={<About initialSection="services" />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:companyId" element={<CompanyCommunity />} />
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
          <Route path="/employer/onboarding" element={<ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}><CompanyInfo /></ProtectedRoute>} />
          <Route
            path="/employee-profile-completion"
            element={
              <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                <EmployerProfile />
              </ProtectedRoute>
            }
          />

          {/* ነባር የ Seeker Routes */}
          {/* Legacy Personal Information URLs now continue through the CV step. */}
          <Route path="/personal-info" element={<Navigate to="/seeker/personal-info" replace />} />
          <Route path="/personalInfo" element={<Navigate to="/seeker/personal-info" replace />} />
          <Route path="/seeker/personal-info" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><Profile /></ProtectedRoute>} />
          <Route
            path="/upload-cv"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                <CvUploadScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cv-upload"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                <CvUploadScreen />
              </ProtectedRoute>
            }
          />
          <Route path="/seeker/cv-upload" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}><CvUploadScreen /></ProtectedRoute>} />
          <Route
            path="/cv-builder"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                <CvUploader />
              </ProtectedRoute>
            }
          />
          <Route
            path="/update-cv"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                <UpdateCV />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seeker-dashboard"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                <JobSeekerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/ai-matches" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<SeekerModulePage module="matches" />)}</ProtectedRoute>} />
          <Route path="/saved-jobs" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<SeekerModulePage module="saved" />)}</ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<SeekerModulePage module="notifications" />)}</ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<SeekerModulePage module="settings" />)}</ProtectedRoute>} />
          <Route
            path="/seekerDashboard"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                <JobSeekerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>
                <JobSeekerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/resume" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<MyResume />)}</ProtectedRoute>} />
          <Route path="/resume/preview" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<ResumePreview />)}</ProtectedRoute>} />
          <Route path="/profile/me" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<MyProfile />)}</ProtectedRoute>} />
          <Route path="/profile/create" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<About initialSection="create-profile" />)}</ProtectedRoute>} />
          <Route path="/profile/portfolio" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<About initialSection="about" />)}</ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<EditProfile />)}</ProtectedRoute>} />
          <Route path="/profile/certificates/:id" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<CertificatePreview />)}</ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<MyApplications />)}</ProtectedRoute>} />
          <Route path="/applications/:id" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<ApplicationDetails />)}</ProtectedRoute>} />
          <Route path="/interviews/:id" element={<ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "user", "employee"]}>{withSeekerSidebar(<InterviewDetails />)}</ProtectedRoute>} />
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
          <Route path="/CvAnalysis" element={<Navigate to="/resume" replace />} />
          <Route path="/cv-analysis" element={<Navigate to="/resume" replace />} />
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
            path="/employer/dashboard/overview"
            element={
              <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                <DashboardOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer-dashboard"
            element={
              <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                <EmployerWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/dashboard"
            element={
              <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                <EmployerWorkspace />
              </ProtectedRoute>
            }
          />
          <Route path="/seeker/profile" element={<ProtectedRoute allowedRoles={["job_seeker"]}>{withSeekerSidebar(<MyProfile />)}</ProtectedRoute>} />
          <Route
            path="/employer/candidates"
            element={
              <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                <EmployerWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/post-job"
            element={
              <ProtectedRoute allowedRoles={["employer", "company", "recruiter"]}>
                <EmployerWorkspace />
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
          <Route path="/admin/desk" element={<ProtectedRoute allowedRoles={["admin", "super_admin"]}><AdminDashboard /></ProtectedRoute>} />
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
                {withSeekerSidebar(<MyProfile />)}
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
            path="/chat/:conversationId"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "employer", "admin", "user", "employee"]}>
                {withSeekerSidebar(<Communication />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute allowedRoles={["job_seeker", "seeker", "jobseeker", "employer", "admin", "user", "employee"]}>
                {withSeekerSidebar(<Communication />)}
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