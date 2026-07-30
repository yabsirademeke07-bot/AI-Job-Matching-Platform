import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from "./pages/Home/Home";
import About from './pages/About';
import Contact from './pages/Contact';
import JobList from './pages/JobList';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import SeekerDashboard from "./pages/SeekerDashboard";
import EmployerDashboard from "./pages/EmployerDashboard";
import UploadCv from './pages/UploadCv';
import JobDetails from './pages/Jobdetails'; 
import MatchResults from './pages/MatchResults'; // 👈 1. Import ተደርጓል

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<JobList />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/upload-cv" element={<UploadCv />} />
            <Route path="/match-results" element={<MatchResults />} /> {/* 👈 2. Route ተጨምሯል */}
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/job-details/:id" element={<JobDetails />} /> {/* 👈 3. JobDetails የሚያሳይ Route ተጨምሯል */}
            <Route path="/seeker-dashboard" element={<SeekerDashboard />} />
            <Route path="/employer/dashboard" element={<EmployerDashboard />} /> 
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;