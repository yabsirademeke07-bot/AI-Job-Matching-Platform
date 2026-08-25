import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/about/Sidebar";
import AboutView from "../components/about/AboutView";

const navItems = [
  { id: "overview", label: "Overview", path: "/about/overview" },
  { id: "experience", label: "Experience", path: "/experience" },
  { id: "skills", label: "Skills", path: "/skills" },
  { id: "projects", label: "Projects", path: "/projects" },
  { id: "services", label: "Services", path: "/about/services" },
  { id: "jobs", label: "Jobs", path: "/about/jobs" },
  { id: "about", label: "About", path: "/about" },
  { id: "prompts", label: "Prompt Studio", path: "/about/prompts" },
  { id: "contact", label: "Contact", path: "/about/contact" },
  { id: "createProfile", label: "Create Profile", path: "/profile/create" },
];

export default function AboutPage({ initialSection = "services" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialSection);
  const [lang] = useState("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionPaths = Object.fromEntries(navItems.map((item) => [item.id, item.path]));
  const routeSections = {
    "/about": "about",
    "/about/overview": "overview",
    "/about/services": "services",
    "/about/prompts": "prompts",
    "/about/contact": "contact",
    "/experience": "experience",
    "/skills": "skills",
    "/projects": "projects",
    "/about/jobs": "jobs",
    "/prompt-studio": "prompts",
    "/services": "services",
    "/profile/create": "createProfile",
  };
  const activeSection = routeSections[location.pathname] || activeTab;

  const handleSectionChange = (section) => {
    if (sectionPaths[section]) {
      navigate(sectionPaths[section]);
      setSidebarOpen(false);
      return;
    }
    setActiveTab(section);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <div className="min-h-screen w-full bg-slate-50 pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-0">
          <div className="flex items-start gap-3 lg:gap-4">
            {sidebarOpen && (
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
              />
            )}

            <aside className={`${sidebarOpen ? "fixed inset-0 z-50 block w-full" : "hidden"} shrink-0 self-start md:sticky md:top-4 md:block md:h-fit md:w-72`}>
              <Sidebar
                navItems={navItems}
                currentSection={activeSection}
                setCurrentSection={handleSectionChange}
                language={lang}
                sidebarOpen={sidebarOpen}
                onCloseSidebar={() => setSidebarOpen(false)}
              />
            </aside>

            <main className="min-w-0 flex-1 bg-slate-50">
              <AboutView activeTab={activeSection} onNavigate={handleSectionChange} lang={lang} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}


