import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Play,
  Repeat,
  Bell,
  Maximize2,
  MessageSquareText,
  Minimize2,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import LogoutFlowModals from './LogoutFlowModals';
import SeekerAlertsMenu from './seeker/SeekerAlertsMenu';
import { getNextOnboardingStep } from '../utils/applicationFlow';
import { resolveUserRole } from '../utils/authSession';
import API from '../services/api';
import logoImage from '../pages/images/logo1.png';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setSession, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutSession, setLogoutSession] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 30);
  const profileMenuRef = useRef(null);

  const isActive = (path) => location.pathname === path;
  const isHomePage = location.pathname === '/';
  const isTransparentHome = isHomePage && !isScrolled && !isMobileMenuOpen;
  // የ Role ዓይነቶች ማረጋገጫ
  const role = (user?.role || user?.userType || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
  const isAdmin = ['admin', 'super_admin'].includes(resolveUserRole(user));
  const isEmployer = ['employer', 'company', 'recruiter'].includes(role);
  const isSeeker = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(role);
  const isSeekerDashboardPage = ['/dashboard', '/seeker-dashboard', '/seekerDashboard'].includes(location.pathname);

  const isEmployerDashboardRoute = location.pathname === '/employer-dashboard'
    || location.pathname.startsWith('/employer-dashboard/')
    || location.pathname === '/employer/workspace'
    || location.pathname.startsWith('/employer/workspace/')
    || location.pathname === '/employer/dashboard'
    || location.pathname.startsWith('/employer/dashboard/');

  const displayName = user?.name || user?.full_name || user?.email || 'User';
  const avatarUrl = user?.avatarUrl || user?.avatar_url;
  const getInitials = (name) => {
    if (!name) return 'SD';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(name).slice(0, 2).toUpperCase();
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Unable to toggle fullscreen:', error);
    }
  };

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const isOnboardingInProgress = () => {
    const storedUser = getStoredUser();
    const role = String(storedUser.role || user?.role || 'job_seeker').toLowerCase();
    const seekerRoles = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'];
    const employerRoles = ['employer', 'company', 'recruiter'];

    if (seekerRoles.includes(role)) {
      if (storedUser.seeker_onboarded === true || storedUser.has_cv === true || storedUser.onboardingCvUploaded === true) return false;
      const hasUploadedCv = Boolean(localStorage.getItem('pending_cv_data') || storedUser.onboardingCvUploaded || storedUser.has_cv || storedUser.cvFileName);
      const isProfileComplete = Boolean(storedUser.profileCompleted || storedUser.onboardingProfileCompleted || storedUser.profileComplete);
      return !isProfileComplete || !hasUploadedCv;
    }

    if (employerRoles.includes(role)) {
      return !(storedUser.companyVerified || storedUser.companyProfileComplete);
    }

    return false;
  };

  const getRoleLabel = (roleName) => {
    const normalized = String(roleName || '').toLowerCase().replace(/[\s-]+/g, '_');
    if (['admin', 'super_admin'].includes(normalized)) return 'Account';
    if (['employer', 'company', 'recruiter'].includes(normalized)) return 'Employer';
    if (['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(normalized)) return 'Job Seeker';
    return 'Job Seeker';
  };

  const handleResumeProgress = async () => {
    const storedUser = getStoredUser();
    const activeRole = String(storedUser.role || localStorage.getItem('activeRole') || user?.role || 'job_seeker').toLowerCase().replace(/[\s-]+/g, '_');
    const seekerRoles = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'];
    const employerRoles = ['employer', 'company', 'recruiter'];

    setProfileMenuOpen(false);

    if (seekerRoles.includes(activeRole)) {
      if (storedUser.seeker_onboarded === true || storedUser.has_cv === true || storedUser.onboardingCvUploaded === true) {
        navigate('/dashboard', { replace: true });
        return;
      }
      try {
        const { data } = await API.get('/seeker/profile-status');
        const step = String(data?.onboarding_step || 'cv_upload');
        const cvSkipped = Boolean(data?.cv_skipped);
        const profileCompleted = Boolean(data?.profile_completed);

        if (profileCompleted || step === 'completed') {
          navigate('/seeker-dashboard', { replace: true });
        } else if (step === 'personal_info' || cvSkipped) {
          console.log('Navigating from Continue button to personal-info');
          navigate('/seeker/personal-info', { replace: true });
        } else {
          navigate('/seeker/cv-upload', { replace: true });
        }
        return;
      } catch (error) {
        console.warn('Profile status fallback used:', error?.message || error);
      }

      const localStep = String(localStorage.getItem('onboarding_step') || '').trim().toLowerCase();
      const isCvSkipped = String(localStorage.getItem('cv_skipped') || '').toLowerCase() === 'true';
      const localProfileComplete = Boolean(storedUser.profileCompleted || storedUser.onboardingProfileCompleted || storedUser.profileComplete || localStorage.getItem('userProfile'));

      if (localProfileComplete || localStep === 'completed') {
        navigate('/seeker-dashboard', { replace: true });
      } else if (localStep === 'personal_info' || isCvSkipped) {
        console.log('Navigating from Continue button to personal-info');
        navigate('/seeker/personal-info', { replace: true });
      } else {
        navigate('/seeker/cv-upload', { replace: true });
      }
      return;
    }

    if (employerRoles.includes(activeRole)) {
      const isCompanyVerified = Boolean(storedUser.companyVerified || storedUser.companyProfileComplete);
      if (isCompanyVerified) {
        navigate('/employer-dashboard', { replace: true });
      } else {
        navigate('/employer/onboarding', { replace: true });
      }
      return;
    }

    navigate(getNextOnboardingStep(), { replace: true });
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen((open) => !open);
  };

  const handleSwitchRole = () => {
    setProfileMenuOpen(false);
    localStorage.removeItem('activeRole');
    navigate('/select-role', { replace: true });
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    setLogoutSession({ token, user });
    setLogoutOpen(true);
  };

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 30);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, [location.pathname]);

  useEffect(() => {
    const closeProfileMenu = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', closeProfileMenu);
    return () => document.removeEventListener('mousedown', closeProfileMenu);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isEmployer) return undefined;

    let mounted = true;
    const loadUnreadNotifications = () => API.get('/employer/notifications/unread-count')
      .then(({ data }) => {
        if (mounted) setUnreadNotificationCount(Number(data?.data?.count ?? data?.count ?? 0));
      })
      .catch((error) => console.error('Unable to load unread notification count:', error));
    const loadUnreadMessages = () => API.get('/employer/messages/conversations/unread-count')
      .then(({ data }) => {
        if (mounted) setUnreadMessageCount(Number(data?.data?.count ?? data?.count ?? 0));
      })
      .catch((error) => console.error('Unable to load unread message count:', error));
    const refreshCounts = () => {
      loadUnreadNotifications();
      loadUnreadMessages();
    };

    refreshCounts();
    const intervalId = window.setInterval(refreshCounts, 15000);
    window.addEventListener('employer-notifications:updated', loadUnreadNotifications);
    window.addEventListener('employer-messages:updated', loadUnreadMessages);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('employer-notifications:updated', loadUnreadNotifications);
      window.removeEventListener('employer-messages:updated', loadUnreadMessages);
    };
  }, [isAuthenticated, isEmployer, user?.id]);

  return (
    <header className={`navbar fixed left-0 top-0 z-50 w-full transition-all duration-300 ${isTransparentHome ? 'border-transparent bg-transparent text-white shadow-none' : 'border-b border-slate-200/80 bg-white/95 text-slate-700 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95'}`}>
      {/* Container: px-4 sm:px-6 lg:px-8 በመጠቀም ወደ ግራ እና ቀኝ ዳር እንዲጠጋ ተደርጓል */}
      <div className="navbar-main-grid w-full px-3 sm:px-6 lg:px-8 h-20 sm:h-24 grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">

        {/* BRAND LOGO */}
        <Link to="/" className="navbar-brand-mark group flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <div className="navbar-brand-image relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sky-200 bg-gradient-to-br from-sky-100 via-white to-blue-100 shadow-sm ring-2 ring-sky-100 transition-transform duration-200 group-hover:scale-[1.02] sm:h-14 sm:w-14">
            <img src={logoImage} alt="AI Job Matching" className="h-full w-full object-cover" />
          </div>
          <div className="navbar-brand-text flex min-w-0 flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="navbar-brand-title whitespace-nowrap text-sm font-black italic leading-none tracking-tight sm:text-xl">
                <span className={`ml-1.5 font-black italic ${isTransparentHome ? 'text-white' : 'text-slate-900'}`}>JOB</span>
                <span className={`ml-1 font-black italic ${isTransparentHome ? 'text-white' : 'text-blue-600'}`}>MATCHING</span>
              </span>
            </div>
            <span className={`navbar-brand-tagline mt-0.5 whitespace-nowrap text-[10px] font-bold italic uppercase tracking-widest ${isTransparentHome ? 'text-white/80' : 'text-slate-400'}`}>
              Smart Career Platform
            </span>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION LINKS */}
        <nav className="hidden lg:flex items-center justify-center gap-5 xl:gap-7 min-w-0">

          <Link
            to="/"
            className={`relative inline-flex items-center py-1 text-base font-bold italic leading-6 tracking-wide transition-colors duration-200 group ${isActive('/') ? (isTransparentHome ? 'text-sky-300' : 'text-sky-600') : (isTransparentHome ? 'text-white hover:text-sky-300' : 'text-slate-700 hover:text-sky-600')
              }`}
          >
            Home
            <span className={`absolute bottom-0 left-0 w-full h-0.5 ${isTransparentHome ? 'bg-sky-400' : 'bg-sky-600'} rounded-full transition-transform duration-300 origin-left ${isActive('/') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          <Link
            to="/jobs"
            className={`relative inline-flex items-center py-1 text-base font-bold italic leading-6 tracking-wide transition-colors duration-200 group ${isActive('/jobs') || isActive('/explorejobs') ? (isTransparentHome ? 'text-sky-300' : 'text-sky-600') : (isTransparentHome ? 'text-white hover:text-sky-300' : 'text-slate-700 hover:text-sky-600')
              }`}
          >
            Explore Jobs
            <span className={`absolute bottom-0 left-0 w-full h-0.5 ${isTransparentHome ? 'bg-sky-400' : 'bg-sky-600'} rounded-full transition-transform duration-300 origin-left ${isActive('/jobs') || isActive('/explorejobs') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          <Link
            to="/how-it-works"
            className={`relative inline-flex items-center py-1 text-base font-bold italic leading-6 tracking-wide transition-colors duration-200 group ${isActive('/how-it-works') ? (isTransparentHome ? 'text-sky-300' : 'text-sky-600') : (isTransparentHome ? 'text-white hover:text-sky-300' : 'text-slate-700 hover:text-sky-600')
              }`}
          >
            How It Works
            <span className={`absolute bottom-0 left-0 w-full h-0.5 ${isTransparentHome ? 'bg-sky-400' : 'bg-sky-600'} rounded-full transition-transform duration-300 origin-left ${isActive('/how-it-works') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          <Link
            to="/about"
            className={`relative inline-flex items-center py-1 text-base font-bold italic leading-6 tracking-wide transition-colors duration-200 group ${isActive('/about') ? (isTransparentHome ? 'text-sky-300' : 'text-sky-600') : (isTransparentHome ? 'text-white hover:text-sky-300' : 'text-slate-700 hover:text-sky-600')
              }`}
          >
            About Us
            <span className={`absolute bottom-0 left-0 w-full h-0.5 ${isTransparentHome ? 'bg-sky-400' : 'bg-sky-600'} rounded-full transition-transform duration-300 origin-left ${isActive('/about') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

          <Link
            to="/contact"
            className={`relative inline-flex items-center py-1 text-base font-bold italic leading-6 tracking-wide transition-colors duration-200 group ${isActive('/contact') ? (isTransparentHome ? 'text-sky-300' : 'text-sky-600') : (isTransparentHome ? 'text-white hover:text-sky-300' : 'text-slate-700 hover:text-sky-600')
              }`}
          >
            Contact
            <span className={`absolute bottom-0 left-0 w-full h-0.5 ${isTransparentHome ? 'bg-sky-400' : 'bg-sky-600'} rounded-full transition-transform duration-300 origin-left ${isActive('/contact') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
          </Link>

        </nav>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-1 sm:gap-2">
          {isAuthenticated && isSeeker && <SeekerAlertsMenu />}
          {isAuthenticated && isEmployer && isEmployerDashboardRoute && (
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => navigate('/employer/dashboard?view=notifications')}
                className={`relative rounded-xl p-2 transition sm:p-2.5 ${isTransparentHome ? 'text-white hover:bg-white/10 hover:text-sky-300' : 'text-slate-600 hover:bg-slate-100 hover:text-sky-600'}`}
                aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ''}`}
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-md shadow-rose-500/40 animate-pulse">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/employer/dashboard?view=messages')}
                className={`relative rounded-xl p-2 transition sm:p-2.5 ${isTransparentHome ? 'text-white hover:bg-white/10 hover:text-sky-300' : 'text-slate-600 hover:bg-slate-100 hover:text-sky-600'}`}
                aria-label={`Messages${unreadMessageCount ? `, ${unreadMessageCount} unread` : ''}`}
                title="Messages"
              >
                <MessageSquareText className="h-5 w-5" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-md shadow-rose-500/40 animate-pulse">
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`rounded-xl p-2 transition sm:p-2.5 ${isTransparentHome ? 'text-white hover:bg-white/10 hover:text-sky-300' : 'text-slate-600 hover:bg-slate-100 hover:text-sky-600'}`}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            </div>
          )}
          <div className="hidden shrink-0 items-center justify-end gap-3 lg:flex">
          {isAuthenticated && (
            <div ref={profileMenuRef} className="relative">
              <button
                id="user-avatar-circle"
                type="button"
                onClick={toggleProfileMenu}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-bold italic transition ${isTransparentHome ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover shadow-sm ring-2 ring-white" />
                  : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-black italic text-blue-700 shadow-sm">{getInitials(user?.name || user?.full_name)}</span>}
                <span className={`max-w-40 truncate font-bold italic ${isTransparentHome ? 'text-white' : 'text-slate-800'}`}>{displayName}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl" role="menu">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900">{displayName}</span>
                      <span className="mt-1 inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-700">{getRoleLabel(role)}</span>
                    </div>
                  </div>
                  {isAdmin ? (
                    <button type="button" onClick={() => { setProfileMenuOpen(false); navigate('/admin/dashboard'); }} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-blue-700 transition hover:bg-blue-50" role="menuitem">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setProfileMenuOpen(false); handleResumeProgress(); }} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700" role="menuitem">
                        <Play className="h-4 w-4" />
                        <span>Continue Setup</span>
                      </button>
                      <button type="button" onClick={() => { setProfileMenuOpen(false); navigate('/profile/me'); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700" role="menuitem">
                        <User className="h-4 w-4" />
                        <span>My Profile</span>
                      </button>
                      <button type="button" onClick={handleSwitchRole} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100" role="menuitem">
                        <Repeat className="h-4 w-4" />
                        <span>Switch Role</span>
                      </button>
                    </>
                  )}
                  <button type="button" onClick={handleLogout} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50" role="menuitem">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {!isAuthenticated && !isSeekerDashboardPage && (
            <>
              <Link to="/login" className="brand-button h-12 min-w-[150px] text-base xl:text-lg shadow-[0_10px_18px_rgba(78,150,214,0.25)]"><span>Log In</span></Link>
              <Link to="/register" className="brand-button h-12 min-w-[160px] text-base xl:text-lg shadow-[0_10px_18px_rgba(78,150,214,0.25)]"><span>Sign Up</span></Link>
            </>
          )}
          </div>

        {/* MOBILE & TABLET HAMBURGER MENU BUTTON */}
        <div className="navbar-mobile-menu flex shrink-0 items-center lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className={`p-2.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer ${isTransparentHome ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {isMobileMenuOpen ? (
              <X className="w-7 h-7 text-blue-600" />
            ) : (
              <Menu className={`w-7 h-7 ${isTransparentHome ? 'text-white' : 'text-slate-800'}`} />
            )}
          </button>
        </div>
        </div>

      </div>

      {/* MOBILE & TABLET DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 bg-white px-4 pt-3 pb-6 shadow-xl w-full">
          <div className="flex flex-col gap-2 w-full">

            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold italic text-base transition-colors ${isActive('/') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              Home
            </Link>

            <Link
              to="/jobs"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold italic text-base transition-colors ${isActive('/jobs') || isActive('/explorejobs') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              Explore Jobs
            </Link>

            <Link
              to="/how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold italic text-base transition-colors ${isActive('/how-it-works') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              How It Works
            </Link>

            <Link
              to="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold italic text-base transition-colors ${isActive('/about') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              About Us
            </Link>

            <Link
              to="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-xl font-bold italic text-base transition-colors ${isActive('/contact') ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              Contact
            </Link>

            {isAuthenticated && (
              <div ref={profileMenuRef} className="relative pt-3 mt-2 border-t border-slate-100">
                <button type="button" onClick={handleResumeProgress} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-2 text-left text-sm font-bold italic text-slate-700 hover:bg-slate-50" aria-expanded={profileMenuOpen} aria-haspopup="menu" aria-label="Open account menu">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-blue-100 text-sm font-black italic text-blue-700 flex items-center justify-center shadow-sm">{getInitials(user?.name || user?.full_name)}</div>}
                  <span className="flex-1 truncate">{displayName}</span><ChevronDown className={`h-4 w-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileMenuOpen && <div className="mt-1 space-y-1 px-1"><button type="button" onClick={() => { handleResumeProgress(); setIsMobileMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"><Play className="w-5 h-5" /><span>{isOnboardingInProgress() ? 'Continue Setup' : 'My Profile'}</span></button><button type="button" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50"><LogOut className="w-5 h-5" /><span>Log Out</span></button></div>}
              </div>
            )}
            {!isAuthenticated && !isSeekerDashboardPage && (
              <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col gap-2.5">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="brand-button h-12 w-full text-base shadow-[0_10px_18px_rgba(78,150,214,0.25)]"><span>Log In</span></Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="brand-button h-12 w-full text-base shadow-[0_10px_18px_rgba(78,150,214,0.25)]"><span>Sign Up</span></Link>
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