import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import logoImage from '../pages/images/logo1.png';

function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-blue-900/60 bg-gradient-to-br from-[#071b2b] via-[#0b3554] to-[#02070c] text-sm text-slate-300">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        
        {/* Top Grid Section */}
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" aria-label="Job Matching Smart Career Platform home" className="inline-flex items-center gap-3 text-white transition-opacity hover:opacity-90">
              <img
                src={logoImage}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full border-2 border-blue-200 bg-white object-cover object-[20%_center] p-0.5 shadow-lg shadow-blue-950/30"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-black uppercase tracking-tight text-white sm:text-lg">
                  Job <span className="text-blue-300">Matching</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-100/80 sm:text-[11px]">
                  Smart Career Platform
                </span>
              </span>
            </Link>
            
            <p className="max-w-sm text-xs leading-relaxed text-slate-300 md:text-sm">
              An AI-powered job-matching platform connecting people with the right opportunities across every industry—from agriculture and technology to healthcare, business, and beyond.
            </p>

          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">Quick Links</h4>
            <ul className="space-y-2.5 text-xs md:text-sm">
              <li>
                <Link to="/" className="transition hover:text-blue-200">Home</Link>
              </li>
              <li>
                <Link to="/explore-jobs" className="transition hover:text-blue-200">Explore Jobs</Link>
              </li>
              <li>
                <Link to="/how-it-works" className="transition hover:text-blue-200">How It Works</Link>
              </li>
              <li>
                <Link to="/about" className="transition hover:text-blue-200">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="transition hover:text-blue-200">Contact</Link>
              </li>
              <li>
                <Link to="/login" state={{ allowLogin: true }} className="transition hover:text-blue-200">Log In</Link>
              </li>
              <li>
                <Link to="/register" className="transition hover:text-blue-200">Sign Up</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">Get in Touch</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-blue-300" />
                <span>Addis Ababa, Ethiopia</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-blue-300" />
                <a href="mailto:yabsirademeke07@gmail.com" className="transition hover:text-blue-200">
                  yabsirademeke07@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-blue-300" />
                <a href="tel:0952748973" className="transition hover:text-blue-200">
                  0952748973
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} EthioSolve AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="#" className="transition hover:text-blue-200">Privacy Policy</Link>
            <Link to="#" className="transition hover:text-blue-200">Terms of Service</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;