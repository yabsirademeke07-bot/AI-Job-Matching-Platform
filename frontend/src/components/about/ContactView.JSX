import { GitBranch, Globe, Link2, Mail, MapPin, Phone, Send } from "lucide-react";

export default function ContactView({ onNavigate }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
          <Mail className="h-3.5 w-3.5" />
          Contact
        </div>

        <h2 className="text-3xl font-bold text-slate-900">Let&apos;s connect</h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">Email</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">enezih.adirigilgne@gmail.com</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold">Phone</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">+251 912 345 678</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Link2 className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold">LinkedIn</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">linkedin.com/in/enezih</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <GitBranch className="h-4 w-4 text-slate-700" />
                <span className="font-semibold">GitHub</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">github.com/enezih</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-900">
              <MapPin className="h-4 w-4 text-cyan-600" />
              <span className="font-semibold">Location</span>
            </div>
            <p className="text-sm text-slate-600">Addis Ababa, Ethiopia</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Contact form</h3>

          <form className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input type="text" placeholder="Your name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" placeholder="you@example.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
              <textarea rows="5" placeholder="Tell me about your project or opportunity..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              <Send className="h-4 w-4" /> Send message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
