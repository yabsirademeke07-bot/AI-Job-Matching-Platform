import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import contactImg from '../pages/images/contact.jpg';

const contactCards = [
  { title: 'Email Us', value: 'yabsirademeke07@gmail.com', description: 'Get help with your account, applications, or platform questions.', icon: Mail },
  { title: 'Call Us', value: '0952748973', description: 'Available during business hours.', icon: Phone },
  { title: 'Visit Us', value: 'Addis Ababa, Ethiopia', description: 'Serving job seekers and employers across Ethiopia.', icon: MapPin },
  { title: 'Business Hours', value: 'Monday - Friday', description: '8:30 AM - 5:30 PM', icon: Clock3 },
];

const faqs = [
  ['How does AI job matching work?', 'Our matching engine compares skills, experience, preferences, and job requirements to surface relevant opportunities and transparent fit scores.'],
  ['How can I apply for a job?', 'Create your profile, explore matching opportunities, and use the application action on any job that fits your goals.'],
  ['How can employers post jobs?', 'Employers can create a company account and use the employer workspace to publish and manage verified vacancies.'],
  ['How does the AI match candidates?', 'The platform evaluates multiple signals including skills, experience, location, and role requirements rather than relying on keywords alone.'],
  ['How can I update my profile or CV?', 'Open your profile or CV workspace from your dashboard, update the relevant details, and save your changes.'],
  ['How can I contact support?', 'Use this form or email yabsirademeke07@gmail.com and our team will respond during business hours.'],
];

const initialForm = { firstName: '', lastName: '', email: '', phone: '', subject: '', userType: '', message: '' };

function validateForm(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!form.email.trim()) errors.email = 'Email address is required.';
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (!form.subject) errors.subject = 'Choose a subject.';
  if (!form.message.trim()) errors.message = 'Message is required.';
  else if (form.message.trim().length < 20) errors.message = 'Message must be at least 20 characters.';
  else if (form.message.length > 1000) errors.message = 'Message must be 1000 characters or fewer.';
  return errors;
}

function FieldError({ children }) {
  return children ? <p className="mt-1 text-xs font-semibold text-red-600">{children}</p> : null;
}

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // No contact endpoint exists in the current API service; this adapter is ready for one.
    setIsSending(true);
    window.setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
    }, 700);
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
    setIsSent(false);
  };

  return (
    <main className="bg-brand-soft/40 text-slate-800">
      <section className="relative overflow-hidden border-b border-[var(--brand-border)] bg-gradient-to-br from-[#f0f7fc] via-white to-[#eaf4fb] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-[#56a2d8]/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] brand-text shadow-sm"><MessageSquareText className="h-4 w-4" /> Get In Touch</span>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Let&apos;s Build Better <span className="brand-text">Career Connections</span></h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">Have a question, need help, or want to partner with us? Our team is here to help you connect with the right opportunities and talent.</p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold brand-text"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Trusted support</span><span className="inline-flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI-powered guidance</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-md"><div className="absolute -inset-4 rounded-[2rem] brand-gradient opacity-15 blur-2xl" /><div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-3 shadow-2xl shadow-[#2b73a4]/15"><img src={contactImg} alt="Support team member ready to help" className="h-64 w-full rounded-[1.5rem] object-cover sm:h-80" /><div className="absolute bottom-7 left-7 right-7 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-lg backdrop-blur"><span className="flex h-10 w-10 items-center justify-center rounded-xl brand-bg text-white"><Sparkles className="h-5 w-5" /></span><span><strong className="block text-sm text-slate-900">Your questions, matched with answers</strong><small className="text-xs text-slate-500">Our support team is here for you</small></span></div></div></div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{contactCards.map(({ title, value, description, icon: Icon }) => <article key={title} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[var(--brand-primary)] hover:shadow-lg"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft brand-text transition group-hover:brand-bg group-hover:text-white"><Icon className="h-5 w-5" /></span><h2 className="mt-5 text-base font-black text-slate-900">{title}</h2><p className="mt-2 break-words text-sm font-bold brand-text">{value}</p><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>)}</div></section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-5"><div className="rounded-3xl brand-gradient p-7 text-white shadow-xl shadow-[#2b73a4]/15"><p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">Support that understands your journey</p><h2 className="mt-4 text-2xl font-black">We&apos;re here to help you move forward.</h2><p className="mt-4 text-sm leading-7 text-white/80">Whether you are searching for your next role or building a high-performing team, tell us what you need.</p><div className="mt-7 space-y-4 text-sm"><p className="flex items-center gap-3"><Mail className="h-5 w-5" /> yabsirademeke07@gmail.com</p><p className="flex items-center gap-3"><Phone className="h-5 w-5" /> 0952748973</p><p className="flex items-center gap-3"><MapPin className="h-5 w-5" /> Addis Ababa, Ethiopia</p></div></div><div className="rounded-3xl border border-[var(--brand-border)] bg-brand-soft p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] brand-text">AI Platform HQ</p><h3 className="mt-3 text-xl font-black text-slate-900">Serving Ethiopia&apos;s career community</h3><p className="mt-2 text-sm leading-6 text-slate-600">Reach us directly for account support, hiring partnerships, or platform questions.</p><div className="mt-5 space-y-3 text-sm font-semibold brand-text"><p className="flex items-center gap-3"><Mail className="h-4 w-4" /> yabsirademeke07@gmail.com</p><p className="flex items-center gap-3"><Phone className="h-4 w-4" /> 0952748973</p></div></div></aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><div className="mb-7"><h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Send Us a Message</h2><p className="mt-2 text-sm leading-6 text-slate-500">Tell us how we can help and we&apos;ll get back to you as soon as possible.</p></div>{isSent ? <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-9 w-9" /></span><h3 className="mt-6 text-2xl font-black text-slate-900">Message Sent Successfully!</h3><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Thank you for contacting us. Our team will get back to you shortly.</p><button type="button" onClick={resetForm} className="mt-7 inline-flex items-center gap-2 rounded-xl brand-bg px-5 py-3 text-sm font-bold text-white transition hover:opacity-90">Send Another Message <ArrowRight className="h-4 w-4" /></button></div> : <form onSubmit={handleSubmit} noValidate className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">First Name<input value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} className="contact-input" /> <FieldError>{errors.firstName}</FieldError></label><label className="text-sm font-bold text-slate-700">Last Name<input value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} className="contact-input" /> <FieldError>{errors.lastName}</FieldError></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Email Address<input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="contact-input" /> <FieldError>{errors.email}</FieldError></label><label className="text-sm font-bold text-slate-700">Phone Number<input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="contact-input" /></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Subject<select value={form.subject} onChange={(e) => updateField('subject', e.target.value)} className="contact-input"><option value="">Choose a subject</option><option>Account Support</option><option>Job Application</option><option>Employer Support</option><option>Technical Issue</option><option>Partnership</option><option>General Question</option><option>Other</option></select><FieldError>{errors.subject}</FieldError></label><label className="text-sm font-bold text-slate-700">User Type<select value={form.userType} onChange={(e) => updateField('userType', e.target.value)} className="contact-input"><option value="">Choose user type</option><option>Job Seeker</option><option>Employer</option><option>Business Partner</option><option>General Inquiry</option><option>Other</option></select></label></div><label className="block text-sm font-bold text-slate-700">Message<textarea value={form.message} onChange={(e) => updateField('message', e.target.value)} maxLength={1000} rows={6} placeholder="Tell us more about your question or issue..." className="contact-input resize-none" /><span className="mt-1 block text-right text-xs text-slate-400">{form.message.length}/1000</span><FieldError>{errors.message}</FieldError></label><button type="submit" disabled={isSending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl brand-gradient px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-[#56a2d8]/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"><Send className="h-4 w-4" />{isSending ? 'Sending...' : 'Send Message'}</button></form>}</section>
      </div></section>

      <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><div className="text-center"><p className="text-xs font-black uppercase tracking-[0.18em] brand-text">Need a quick answer?</p><h2 className="mt-3 text-3xl font-black text-slate-950">Frequently Asked Questions</h2></div><div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">{faqs.map(([question, answer], index) => <div key={question}><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-slate-800"><span>{question}</span><ChevronDown className={`h-5 w-5 shrink-0 brand-text transition-transform ${openFaq === index ? 'rotate-180' : ''}`} /></button><div className={`grid transition-[grid-template-rows] duration-300 ${openFaq === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><p className="px-5 pb-4 text-sm leading-6 text-slate-600">{answer}</p></div></div></div>)}</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl overflow-hidden rounded-3xl brand-gradient px-6 py-12 text-white shadow-xl sm:px-10"><div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center"><div><h2 className="text-3xl font-black">Ready to Find Your Next Opportunity?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Join our AI-powered job matching platform and connect with opportunities that match your skills.</p></div><div className="flex flex-wrap gap-3"><Link to="/jobs" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black brand-text transition hover:bg-brand-soft">Explore Jobs <ArrowRight className="h-4 w-4" /></Link><Link to="/register" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10">Create Account</Link></div></div><div className="mt-8 flex flex-col gap-3 border-t border-white/20 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-sm font-semibold text-white/85"><BriefcaseBusiness className="h-5 w-5" /> Are you hiring? Find the right talent with AI-powered matching.</p><Link to="/company" className="inline-flex items-center gap-2 text-sm font-black text-white hover:underline">Post a Job <ArrowRight className="h-4 w-4" /></Link></div></div></section>
    </main>
  );
}