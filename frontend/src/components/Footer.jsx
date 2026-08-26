import { Link } from 'react-router-dom';
import { Sparkles, Mail, Phone, MapPin, Globe, Share2, MessageSquare } from 'lucide-react';

function Footer() {
  return (
    <footer className="border-t border-[var(--brand-border)] bg-[var(--brand-soft)] text-slate-600 text-sm">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        
        {/* Top Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[var(--brand-border)]">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="text-slate-900 flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-xl border border-[var(--brand-border)] bg-white flex items-center justify-center text-[var(--brand-deep)] shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-slate-900 font-extrabold text-xl tracking-tight">
                job matching
              </span>
            </Link>
            
            <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-sm">
              Ethiopia's premiere AI-powered tech talent platform. Connecting developer skills with top software engineering opportunities with precision matching.
            </p>

            {/* Social / Web Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-deep)] hover:text-white hover:bg-[var(--brand-primary)] transition" title="Website">
                <Globe className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-deep)] hover:text-white hover:bg-[var(--brand-primary)] transition" title="Community">
                <Share2 className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-white border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-deep)] hover:text-white hover:bg-[var(--brand-primary)] transition" title="Contact">
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--brand-deep)] uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-xs md:text-sm">
              <li>
                <Link to="/" className="hover:text-[var(--brand-deep)] transition">Home</Link>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-[var(--brand-deep)] transition">Explore Jobs</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[var(--brand-deep)] transition">About Us</Link>
              </li>
            </ul>
          </div>

          {/* Platform Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--brand-deep)] uppercase tracking-wider">For Talent</h4>
            <ul className="space-y-2.5 text-xs md:text-sm">
              <li>
                <Link to="/register" className="hover:text-[var(--brand-deep)] transition">Create Account</Link>
              </li>
              <li>
                <Link to="/upload-cv" className="hover:text-[var(--brand-deep)] transition">AI CV Analysis</Link>
              </li>
              <li>
                <Link to="/jobs" className="hover:text-[var(--brand-deep)] transition">Skill Matching</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[var(--brand-deep)] transition">Job Alerts</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--brand-deep)] uppercase tracking-wider">Get in Touch</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[var(--brand-deep)] shrink-0" />
                <span>Addis Ababa, Ethiopia</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[var(--brand-deep)] shrink-0" />
                <span>support@job matching</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[var(--brand-deep)] shrink-0" />
                <span>0900455339</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} EthioSolve AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="#" className="hover:text-[var(--brand-deep)] transition">Privacy Policy</Link>
            <Link to="#" className="hover:text-[var(--brand-deep)] transition">Terms of Service</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;