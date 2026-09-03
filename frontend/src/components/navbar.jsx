import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  LayoutDashboard,
  Menu,
  UserPlus,
  X,
} from 'lucide-react';

// የፎቶ Path — use local asset fallback in project
import siteLogo from '../pages/images/logo1.png';
import { useAuth } from '../context/AuthContext';
import LogoutFlowModals from './LogoutFlowModals';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setSession, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutSession, setLogoutSession] = useState(null);

  const isActive = (path) => location.pathname === path;
  // የ Role ዓይነቶች ማረጋገጫ
  const role = (user?.role || user?.userType || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
  const isSeeker = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(role);
  const isEmployer = ['employer', 'company', 'recruiter'].includes(role);
  const isAdmin = role === 'admin';
  const isSeekerDashboardPage = ['/dashboard', '/seeker-dashboard', '/seekerDashboard'].includes(location.pathname);
  const displayName = user?.name || user?.full_name || user?.email || 'User';
  const avatarUrl = user?.avatarUrl || user?.avatar_url;
  const handleLogout = () => {
    setLogoutSession({ token, user });
    setLogoutOpen(true);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all w-full">
      {/* Container: px-4 sm:px-6 lg:px-8 በመጠቀም ወደ ግራ እና ቀኝ ዳር እንዲጠጋ ተደርጓል */}
      <div className="w-full px-4 sm:px-6 lg:px-8 h-20 sm:h-24 flex items-center justify-between gap-4">

        {/* BRAND LOGO - ሙሉ በሙሉ ወደ ግራ */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-950 shadow-md shadow-blue-500/10 transition-transform duration-200 group-hover:scale-[1.02] sm:h-12 sm:w-12">
            <img
              src={siteLogo}
              alt="AI Job Match"
              className="h-full w-full object-contain object-center"
            />
          </div>
        </Link>

        {/* DESKTOP NAVIGATION LINKS - mr-auto ml-6/ml-10 በመጠቀም ወደ ግራ ተጠግተዋል፣ text-lg በመጠቀም መጠናቸው ጨምሯል */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-7 mr-auto ml-6 xl:ml-10">

          <Link
            to="/"
            className={`relative py-1 text-base xl:text-lg font-bold tracking-wide transition-colors duration-200 group ${isActive('/') ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'
              }`}
          >
            Home
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full transition-transform duration-300 origin-left ${isActive('/') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          <Link
            to="/jobs"
            className={`relative py-1 text-base xl:text-lg font-bold tracking-wide transition-colors duration-200 group ${isActive('/jobs') || isActive('/explorejobs') ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'
              }`}
          >
            Explore Jobs
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full transition-transform duration-300 origin-left ${isActive('/jobs') || isActive('/explorejobs') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          <Link
            to="/how-it-works"
            className={`relative py-1 text-base xl:text-lg font-bold tracking-wide transition-colors duration-200 group ${isActive('/how-it-works') ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'
              }`}
          >
            How It Works
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full transition-transform duration-300 origin-left ${isActive('/how-it-works') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          <Link
            to="/about"
            className={`relative py-1 text-base xl:text-lg font-bold tracking-wide transition-colors duration-200 group ${isActive('/about') ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'
              }`}
          >
            About
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full transition-transform duration-300 origin-left ${isActive('/about') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          <Link
            to="/contact"
            className={`relative py-1 text-base xl:text-lg font-bold tracking-wide transition-colors duration-200 group ${isActive('/contact') ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'
              }`}
          >
            Contact
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full transition-transform duration-300 origin-left ${isActive('/contact') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          {/* ተጠቃሚው Login ካደረገ የሚታዩ Dashboard Links */}
          {isAuthenticated && isSeeker && (
            <Link to="/seeker-dashboard" className="text-xs font-extrabold bg-[var(--brand-primary)] text-white px-3.5 py-1.5 rounded-full hover:bg-[var(--brand-primary-hover)] transition flex items-center gap-2 shrink-0">
              <LayoutDashboard className="w-4 h-4" />
              <span>Seeker dashboard</span>
            </Link>
          )}

          {isAuthenticated && isEmployer && (
            <Link to="/employer-dashboard" className="text-xs font-extrabold bg-indigo-50 text-indigo-600 px-3.5 py-1.5 rounded-full hover:bg-indigo-100 transition flex items-center gap-2 shrink-0">
              <LayoutDashboard className="w-4 h-4" />
              <span>Employer dashboard</span>
            </Link>
          )}

          {isAuthenticated && isAdmin && (
            <Link to="/admin-dashboard" className="text-xs font-extrabold bg-purple-50 text-purple-600 px-3.5 py-1.5 rounded-full hover:bg-purple-100 transition flex items-center gap-2 shrink-0">
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin dashbord</span>
            </Link>
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0 ml-auto">
          {isAuthenticated && !isSeekerDashboardPage && (
            <div className="flex items-center gap-3">
              {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{displayName.charAt(0).toUpperCase()}</div>}
              <span className="max-w-40 truncate text-sm font-bold text-slate-700">{displayName}</span>
              <button type="button" onClick={handleLogout} className="flex h-10 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-bold leading-none text-white shadow-sm transition hover:bg-[var(--brand-primary-hover)]" aria-label="Log out"><LogOut className="h-4 w-4" /><span>Log Out</span></button>
            </div>
          )}
          {!isAuthenticated && !isSeekerDashboardPage && (
            <>
              <Link to="/login" className="brand-button text-base px-5 xl:px-6 py-2.5"><LogIn className="w-5 h-5 text-blue-600" /><span>Log In</span></Link>
              <Link to="/register" className="brand-button text-base px-6 xl:px-7 py-2.5"><UserPlus className="w-5 h-5" /><span>Sign Up</span></Link>
            </>
          )}
        </div>

        {/* MOBILE & TABLET HAMBURGER MENU BUTTON */}
        <div className="flex items-center lg:hidden ml-auto">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? (
              <X className="w-7 h-7 text-blue-600" />
            ) : (
              <Menu className="w-7 h-7 text-slate-800" />
            )}
          </button>
        </div>

      </div>

      {/* MOBILE & TABLET DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 bg-white px-4 pt-3 pb-6 shadow-xl w-full">
          <div className="flex flex-col gap-2 w-full">

            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold text-base transition-colors ${isActive('/') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              Home
            </Link>

            <Link
              to="/jobs"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold text-base transition-colors ${isActive('/jobs') || isActive('/explorejobs') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              Explore Jobs
            </Link>

            <Link
              to="/how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold text-base transition-colors ${isActive('/how-it-works') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              How It Works
            </Link>

            <Link
              to="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold text-base transition-colors ${isActive('/about') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              About
            </Link>

            <Link
              to="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold text-base transition-colors ${isActive('/contact') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              Contact
            </Link>

            {/* Mobile User Consoles */}
            {isAuthenticated && isSeeker && (
              <Link
                to="/seeker-dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mx-2 my-1 px-4 py-3 rounded-xl text-sm font-extrabold bg-[var(--brand-primary)] text-white flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Seeker dashboard</span>
              </Link>
            )}

            {isAuthenticated && isEmployer && (
              <Link
                to="/employer-dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mx-2 my-1 px-4 py-3 rounded-xl text-sm font-extrabold bg-indigo-50 text-indigo-600 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Employer dashboard</span>
              </Link>
            )}

            {isAuthenticated && isAdmin && (
              <Link
                to="/admin-dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mx-2 my-1 px-4 py-3 rounded-xl text-sm font-extrabold bg-purple-50 text-purple-600 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin dashboard</span>
              </Link>
            )}

            {isAuthenticated && !isSeekerDashboardPage && (
              <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col gap-2.5">
                <div className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-slate-700">
                  {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">{displayName.charAt(0).toUpperCase()}</div>}
                  <span>{displayName}</span>
                </div>
                <button type="button" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="brand-button w-full text-base"><LogOut className="w-5 h-5" /><span>Log Out</span></button>
              </div>
            )}
            {!isAuthenticated && !isSeekerDashboardPage && (
              <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col gap-2.5">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="brand-button w-full text-base"><LogIn className="w-5 h-5 text-blue-600" /><span>Log In</span></Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="brand-button w-full text-base"><UserPlus className="w-5 h-5" /><span>Sign Up</span></Link>
              </div>
            )}

          </div>
        </div>
      )}

      {logoutOpen && <LogoutFlowModals
        user={logoutSession?.user}
        token={logoutSession?.token}
        logout={logout}
        setSession={setSession}
        navigate={navigate}
        onClose={() => setLogoutOpen(false)}
      />}
    </header>
  );
}