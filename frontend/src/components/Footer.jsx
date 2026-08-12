import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, Phone, MapPin, Globe, Share2, MessageSquare } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        
        {/* Top Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="text-white flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 bg-blue-600/20 rounded-xl border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-white font-extrabold text-xl tracking-tight">
                job matching
              </span>
            </Link>
            
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-sm">
              Ethiopia's premiere AI-powered tech talent platform. Connecting developer skills with top software engineering opportunities with precision matching.
            </p>

            {/* Social / Web Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition" title="Website">
                <Globe className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition" title="Community">
                <Share2 className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition" title="Contact">
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-xs md:text-sm">
              <li>
                <Link to="/" className="hover:text-blue-400 transition">Home</Link>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-blue-400 transition">Explore Jobs</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-400 transition">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-400 transition">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Platform Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">For Talent</h4>
            <ul className="space-y-2.5 text-xs md:text-sm">
              <li>
                <Link to="/register" className="hover:text-blue-400 transition">Create Account</Link>
              </li>
              <li>
                <Link to="/upload-cv" className="hover:text-blue-400 transition">AI CV Analysis</Link>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-blue-400 transition">Skill Matching</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-blue-400 transition">Job Alerts</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Get in Touch</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Addis Ababa, Ethiopia</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>support@job matching</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>+251 911 000 000</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()}job matching. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="#" className="hover:text-slate-400 transition">Privacy Policy</Link>
            <Link to="#" className="hover:text-slate-400 transition">Terms of Service</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;