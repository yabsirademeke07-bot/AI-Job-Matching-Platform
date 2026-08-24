import { useState } from "react";
import OverviewView from "./OverviewView";
import ExperienceView from "./ExperienceView";
import SkillsView from "./SkillsView";
import ProjectsView from "./ProjectsView";
import ServicesView from "./ServicesView";
import JobsView from "./JobsView";
import PromptStudioView from "./PromptStudioView";
import ContactView from "./ContactView";

export default function AboutView({ activeTab = "overview", onNavigate }) {
  const renderSection = () => {
    switch (activeTab) {
      case "overview":
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
    <div className="space-y-6 bg-slate-50">
      {renderSection()}
    </div>
  );
}
