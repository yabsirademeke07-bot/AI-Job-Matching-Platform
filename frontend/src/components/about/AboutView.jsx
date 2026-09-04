import OverviewView from "./OverviewView";
import ExperienceView from "./ExperienceView";
import SkillsView from "./SkillsView";
import ProjectsView from "./ProjectsView";
import ServicesView from "./ServicesView";
import JobsView from "./JobsView";
import PromptStudioView from "./PromptStudioView";
import ContactView from "./ContactView";
import PlatformAboutView from "./PlatformAboutView";
import CreateProfileView from "./CreateProfileView";

export default function AboutView({ activeTab = "overview", onNavigate }) {
  const renderSection = () => {
    switch (activeTab) {
      case "about":
        return <PlatformAboutView onNavigate={onNavigate} />;
      case "createProfile":
        return <CreateProfileView />;
      case "overview":
        return <OverviewView onNavigate={onNavigate} />;
      case "about":
        return <OverviewView onNavigate={onNavigate} />;
      case "experience":
        return <ExperienceView />;
      case "skills":
        return <SkillsView />;
      case "projects":
        return <ProjectsView />;
      case "services":
        return <ServicesView />;
      case "jobs":
        return <JobsView />;
      case "prompts":
        return <PromptStudioView />;
      case "contact":
        return <ContactView />;
      default:
        return <OverviewView onNavigate={onNavigate} />;
    }
  };

  return (
    <div className="space-y-6 bg-white">
      {renderSection()}
    </div>
  );
}
