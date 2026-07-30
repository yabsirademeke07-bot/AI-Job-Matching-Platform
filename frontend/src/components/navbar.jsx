import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
    const navigate = useNavigate();
    // LocalStorage ውስጥ የተቀመጠ የተጠቃሚ መረጃ ካለ ያነባል
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-md sticky top-0 z-50">
            {/* Logo */}
            <h2 className="text-xl font-bold tracking-tight">
                <Link to="/" className="text-white flex items-center gap-2 hover:opacity-90">
                    <span className="text-blue-500 text-2xl">✦</span> AI JobMatch
                </Link>
            </h2>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
                <Link to="/" className="text-slate-300 hover:text-white text-sm font-medium transition">
                    Home
                </Link>
                <Link to="/jobs" className="text-slate-300 hover:text-white text-sm font-medium transition">
                    Explore Jobs
                </Link>
                <Link to="/about" className="text-slate-300 hover:text-white text-sm font-medium transition">
                    About
                </Link>
                <Link to="/contact" className="text-slate-300 hover:text-white text-sm font-medium transition">
                    Contact
                </Link>

                {/* Logged-in User Role Dashboard Links */}
                {user ? (
                    <>
                        {user.role === 'job_seeker' && (
                            <Link to="/seeker-dashboard" className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition">
                                My Dashboard
                            </Link>
                        )}
                        {user.role === 'employer' && (
                            <Link to="/employer-dashboard" className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition">
                                Employer Console
                            </Link>
                        )}
                        {user.role === 'admin' && (
                            <Link to="/admin-dashboard" className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition">
                                Admin Console
                            </Link>
                        )}

                        <button
                            onClick={handleLogout}
                            className="bg-red-600/90 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-slate-300 hover:text-white text-sm font-medium transition">
                            Sign In
                        </Link>
                        <Link
                            to="/register"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm"
                        >
                            Get Started
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;