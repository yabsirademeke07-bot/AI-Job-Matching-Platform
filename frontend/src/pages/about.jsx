import { useState } from "react";
import Sidebar from "../components/about/Sidebar";
import Header from "../components/about/Header";
import AboutView from "../components/about/AboutView";

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "services", label: "Services" },
  { id: "jobs", label: "Jobs" },
  { id: "prompts", label: "Prompt Studio" },
  { id: "contact", label: "Contact" },
];

export default function AboutPage({ initialSection = "services" }) {
  const [activeTab, setActiveTab] = useState(initialSection);
  const [lang, setLang] = useState("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSectionChange = (section) => {
    setActiveTab(section);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <Header
        currentSection={activeTab}
        onSelectSection={handleSectionChange}
        lang={lang}
        onToggleLang={setLang}
        accent="indigo"
        onOpenMobileMenu={() => setSidebarOpen(true)}
        onOpenResumeModal={() => {}}
      />

      <div className="w-full pt-6 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
          <div className="flex items-start gap-6">
            {sidebarOpen && (
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
              />
            )}

            <aside className={`${sidebarOpen ? "fixed left-4 top-20 z-50 block w-72" : "hidden"} shrink-0 self-start md:sticky md:top-24 md:block md:w-64`}>
              <Sidebar
                navItems={navItems}
                currentSection={activeTab}
                setCurrentSection={handleSectionChange}
                language={lang}
                sidebarOpen={sidebarOpen}
                onCloseSidebar={() => setSidebarOpen(false)}
              />
            </aside>

            <main className="min-w-0 flex-1">
              <AboutView activeTab={activeTab} onNavigate={setActiveTab} lang={lang} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}


