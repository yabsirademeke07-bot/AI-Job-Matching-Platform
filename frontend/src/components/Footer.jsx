import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand Info */}
                <div>
                    <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
                        <span className="text-blue-500">✦</span> AI JobMatch
                    </h3>
                    <p className="text-sm leading-relaxed">
                        Empowering tech talent with intelligent job matching. Connecting skilled professionals with leading organizations seamlessly.
                    </p>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 className="text-white font-semibold mb-3">Platform</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link to="/" className="hover:text-white transition">Home</Link></li>
                        <li><Link to="/jobs" className="hover:text-white transition">Explore Jobs</Link></li>
                        <li><Link to="/about" className="hover:text-white transition">About AI Matching</Link></li>
                    </ul>
                </div>

                {/* Support & Legal */}
                <div>
                    <h4 className="text-white font-semibold mb-3">Support</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link to="/contact" className="hover:text-white transition">Contact Us</Link></li>
                        <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div>
                    <h4 className="text-white font-semibold mb-3">Get in Touch</h4>
                    <p className="text-sm mb-2">📍 Addis Ababa, Ethiopia</p>
                    <p className="text-sm mb-2">✉️ support@aijobmatch.com</p>
                    <p className="text-sm">📞 +251 900 000 000</p>
                </div>
            </div>

            <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} AI JobMatch Platform. All rights reserved.
            </div>
        </footer>
    );
}

export default Footer;