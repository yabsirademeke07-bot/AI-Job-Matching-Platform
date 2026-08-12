import { useState } from 'react';
import contactImg from '../pages/images/location.jpg';
import mapImg from '../pages/images/contact.jpg'; // ኦፍላይን የሚሰራው የካርታ ምስል
import '../pages/styles/contact_custom.css';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userType: 'seeker',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', phone: '', userType: 'seeker', subject: '', message: '' });
    }, 4000);
  };

  return (
    <div className="bg-slate-900 text-gray-100 min-h-screen flex flex-col justify-between">
      
      {/* MAIN CONTENT WRAPPER */}
      <main className="space-y-12 pb-16">
        
        {/* SECTION 1: AI Hero Banner */}
        <section className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 pt-16 pb-20 px-6 sm:px-12 text-white">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-8 relative z-10">
            <div className="space-y-4">
              <span className="px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-white border border-white/30">
                AI Powered Support
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Contact Us
              </h1>
              <p className="text-emerald-50 text-base sm:text-lg max-w-md">
                Candidates & Recruiters, get in touch with us today. Fill out the form or use the contact information below.
              </p>
            </div>

            <div className="relative flex justify-center md:justify-end">
              <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-blue-500/30 absolute -top-4 -right-4 blur-2xl"></div>
              
              <img 
                src={contactImg} 
                alt="AI Support Specialist On Phone" 
                className="relative z-10 w-72 h-72 sm:w-80 sm:h-80 object-cover rounded-full border-4 border-white/20 shadow-2xl hero-floating-img"
              />
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-12 -mt-10 relative z-20">
          
          {/* Main Grid: Form & Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* SECTION 2: Contact Form */}
            <section id="contact-form" className="lg:col-span-2 bg-slate-800/95 rounded-3xl p-8 border border-slate-700/80 shadow-2xl space-y-6 backdrop-blur-md">
              <div className="border-b border-slate-700 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-400">1. Send Us a Message</h2>
                  <p className="text-xs text-gray-400 mt-1">Directly route your query to our AI Matching algorithms team.</p>
                </div>
                <span className="text-2xl">⚡</span>
              </div>

              {isSubmitted && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl text-emerald-400 text-sm font-semibold flex items-center justify-between">
                  <span>🎉 Message received! Our AI support team will get back to you within 24 hours.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Your Full Name *</label>
                    <input 
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Eyerus Tekle"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Email Address *</label>
                    <input 
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="eyerus@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Phone Number</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+251 900 000 000"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">I am a...</label>
                    <select 
                      value={formData.userType}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    >
                      <option value="seeker">Job Seeker (Candidate)</option>
                      <option value="employer">Employer / Recruiter</option>
                      <option value="partner">API Integration Partner</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Subject</label>
                  <input 
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Issue with Resume AI Score or Job Posting"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Your Message *</label>
                  <textarea 
                    rows="4"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your inquiry in detail..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 font-bold text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
                >
                  Send Message to Support
                </button>
              </form>
            </section>

            {/* Sidebar Sections */}
            <div className="space-y-6">
              
              {/* SECTION 3: Direct Communication Channels */}
              <section id="direct-info" className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700/80 shadow-xl space-y-4">
                <h2 className="text-lg font-bold text-emerald-400 border-b border-slate-700 pb-3">2. Direct Channels</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                      📧
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Candidates Support</h3>
                      <p className="text-xs text-gray-400">candidates@aijobmatch.com</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
                      💼
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Employers & Enterprise</h3>
                      <p className="text-xs text-gray-400">employers@aijobmatch.com</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                      📞
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Direct Hotline</h3>
                      <p className="text-xs text-gray-400">+251-918-61-92-74 | +251-952-74-89-73</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 4: AI Platform HQ Location (Offline Image Map) */}
              <section id="location-map" className="bg-slate-800/90 rounded-3xl p-4 border border-slate-700/80 shadow-xl space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-sm font-bold text-emerald-400">3. AI Platform HQ Location</h2>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Addis Ababa Hub
                  </span>
                </div>

                <div className="w-full h-52 rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative group">
                  <img 
                    src={mapImg} 
                    alt="AI Job Matching Platform Head Office Location - Addis Ababa" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <a 
                    href="https://maps.google.com/?q=yeka+EDA+Addis+Ababa" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-4 text-center space-y-1"
                  >
                    <span className="text-xl">🤖📍</span>
                    <span className="font-bold text-xs text-emerald-400">AI Job Match Platform HQ</span>
                    <p className="text-[11px] text-gray-300">Click to open live navigation in Google Maps</p>
                  </a>
                </div>
              </section>

            </div>
          </div>

          {/* SECTION 5: Instant Diagnostic Troubleshooting */}
          <section id="ai-diagnostics" className="bg-slate-800/90 rounded-3xl p-8 border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3">
              <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl text-xl">🤖</span>
              <div>
                <h2 className="text-xl font-bold text-white">4. Instant AI Troubleshooting</h2>
                <p className="text-xs text-gray-400">Automated diagnostic tips for immediate self-resolution.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700">
                <h3 className="text-sm font-bold text-emerald-400 mb-1">CV Parsing Issues?</h3>
                <p className="text-xs text-gray-400">Ensure your CV is in PDF or DOCX format. Standard layout headings increase extraction accuracy.</p>
              </div>
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700">
                <h3 className="text-sm font-bold text-blue-400 mb-1">Match Score Verification</h3>
                <p className="text-xs text-gray-400">Scores update automatically when you add new skill tags like React, Node.js, or Express.</p>
              </div>
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700">
                <h3 className="text-sm font-bold text-purple-400 mb-1">Recruiter Verification</h3>
                <p className="text-xs text-gray-400">Employer identity validation takes up to 2 hours for automated compliance check.</p>
              </div>
            </div>
          </section>

          {/* SECTION 6: Enterprise Custom Integration */}
          <section id="enterprise-api" className="bg-gradient-to-r from-slate-800 via-slate-800 to-blue-950/60 rounded-3xl p-8 border border-blue-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Enterprise & API</span>
                <h2 className="text-2xl font-bold text-white mt-1">5. Enterprise ATS & API Integration</h2>
                <p className="text-xs text-gray-300 max-w-xl mt-1">
                  Connect your existing HR software with our smart matching engine for automated candidate filtering.
                </p>
              </div>
              <a href="mailto:api@aijobmatch.com" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded-xl text-xs text-center whitespace-nowrap transition-all shadow-md shadow-blue-600/20">
                Request API Docs
              </a>
            </div>
          </section>

          {/* SECTION 7: Quick System FAQ */}
          <section id="contact-faq" className="bg-slate-800/90 rounded-3xl p-8 border border-slate-700/80 shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-emerald-400 border-b border-slate-700 pb-3">6. Support FAQs</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">How does the AI match algorithm rank candidates?</h3>
                <p className="text-xs text-gray-400">It evaluates skill relevance, experience depth, and tech stack alignment in real-time.</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">What is the standard response time?</h3>
                <p className="text-xs text-gray-400">Our support engineers review and resolve inquiries within 2 to 4 hours on business days.</p>
              </div>
            </div>
          </section>

        </div>
      </main>

    </div>
  );
}