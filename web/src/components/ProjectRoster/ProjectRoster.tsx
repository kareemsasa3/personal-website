import "./ProjectRoster.css";
import { Project } from "../../data/projects";
import ProjectRosterItem from "./ProjectRosterItem";

interface ProjectRosterProps {
  projects: Project[];
}

const ProjectRoster = ({ projects }: ProjectRosterProps) => (
  <ul className="project-roster" role="list">
    {projects.map((project) => (
      <ProjectRosterItem key={project.id} project={project} />
    ))}
  </ul>
);

export default ProjectRoster;
