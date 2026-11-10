import { FileSystemItem } from "../types/terminal";
import { projectsData } from "./projects";
import { workExperienceData } from "./workExperience";
import {
  experienceFileName,
  experienceLines,
  projectReadmeLines,
  terminalFileSize,
} from "./fileContents";

const TERMINAL_DATE = "Dec 15 10:30";

/** One directory per public Projects entry (except the hand-curated `web`), each with a README. */
const projectDirectories = (webDirectory: FileSystemItem): FileSystemItem[] =>
  projectsData.map((project) =>
    project.id === "web"
      ? webDirectory
      : {
          name: project.id,
          type: "directory",
          permissions: "drwxr-xr-x",
          size: "4096",
          date: TERMINAL_DATE,
          ...(project.githubUrl ? { githubUrl: project.githubUrl } : {}),
          children: [
            {
              name: "README.md",
              type: "file",
              permissions: "-rw-r--r--",
              size: terminalFileSize(projectReadmeLines(project)),
              date: TERMINAL_DATE,
            },
          ],
        }
  );

const experienceEntries: FileSystemItem[] = workExperienceData.map((job) => ({
  name: experienceFileName(job),
  type: "file",
  permissions: "-rw-r--r--",
  size: terminalFileSize(experienceLines(job)),
  date: TERMINAL_DATE,
}));

export const fileSystem: FileSystemItem[] = [
  {
    name: "about",
    type: "directory",
    permissions: "drwxr-xr-x",
    size: "4096",
    date: "Dec 15 10:30",
    children: [
      {
        name: "personal-info",
        type: "file",
        permissions: "-rw-r--r--",
        size: "2.1K",
        date: "Dec 15 10:30",
      },
      {
        name: "skills",
        type: "file",
        permissions: "-rw-r--r--",
        size: "1.8K",
        date: "Dec 15 10:30",
      },
      {
        name: "interests",
        type: "file",
        permissions: "-rw-r--r--",
        size: "1.5K",
        date: "Dec 15 10:30",
      },
    ],
  },
  {
    name: "projects",
    type: "directory",
    permissions: "drwxr-xr-x",
    size: "4096",
    date: "Dec 15 10:30",
    route: "/projects",
    children: projectDirectories(
      {
        name: "web",
        type: "directory",
        permissions: "drwxr-xr-x",
        size: "4096",
        date: "Dec 15 10:30",
        githubUrl: "https://github.com/kareemsasa3/personal-website",
        children: [
          {
            name: "README.md",
            type: "file",
            permissions: "-rw-r--r--",
            size: "2.1K",
            date: "Dec 15 10:30",
          },
          {
            name: "BUILD-OVERVIEW.md",
            type: "file",
            permissions: "-rw-r--r--",
            size: "0.8K",
            date: "Dec 15 10:30",
          },
          {
            name: "src",
            type: "directory",
            permissions: "drwxr-xr-x",
            size: "4096",
            date: "Dec 15 10:30",
            children: [
              {
                name: "components",
                type: "directory",
                permissions: "drwxr-xr-x",
                size: "4096",
                date: "Dec 15 10:30",
                children: [
                  {
                    name: "Terminal",
                    type: "directory",
                    permissions: "drwxr-xr-x",
                    size: "4096",
                    date: "Dec 15 10:30",
                    children: [
                      {
                        name: "TERMINAL-ARCHITECTURE.md",
                        type: "file",
                        permissions: "-rw-r--r--",
                        size: "15.2K",
                        date: "Dec 15 10:30",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }
    ),
  },
  {
    name: "experience",
    type: "directory",
    permissions: "drwxr-xr-x",
    size: "4096",
    date: "Dec 15 10:30",
    route: "/experience",
    children: [
      ...experienceEntries,
      {
        name: "freelance",
        type: "file",
        permissions: "-rw-r--r--",
        size: "2.5K",
        date: "Dec 15 10:30",
      },
    ],
  },
  {
    name: "journey",
    type: "directory",
    permissions: "drwxr-xr-x",
    size: "4096",
    date: "Dec 15 10:30",
    route: "/journey",
    children: [],
  },
  {
    name: "education",
    type: "directory",
    permissions: "drwxr-xr-x",
    size: "4096",
    date: "Dec 15 10:30",
    children: [
      {
        name: "bachelor-degree",
        type: "file",
        permissions: "-rw-r--r--",
        size: "2.3K",
        date: "Dec 15 10:30",
      },
      {
        name: "courses",
        type: "directory",
        permissions: "drwxr-xr-x",
        size: "4096",
        date: "Dec 15 10:30",
        children: [
          {
            name: "ossu-computer-science",
            type: "file",
            permissions: "-rw-r--r--",
            size: "3.5K",
            date: "Dec 15 10:30",
            githubUrl: "https://github.com/kareemsasa3/computer-science",
          },
        ],
      },
      {
        name: "workshops",
        type: "file",
        permissions: "-rw-r--r--",
        size: "1.4K",
        date: "Dec 15 10:30",
      },
    ],
  },

  {
    name: "simulations",
    type: "directory",
    permissions: "drwxr-xr-x",
    size: "4096",
    date: "Dec 15 10:30",
    route: "/simulations",
    children: [
      {
        name: "snake",
        type: "directory",
        permissions: "drwxr-xr-x",
        size: "4096",
        date: "Dec 15 10:30",
        route: "/simulations/snake",
        children: [],
      },
      {
        name: "spider",
        type: "directory",
        permissions: "drwxr-xr-x",
        size: "4096",
        date: "Dec 15 10:30",
        route: "/simulations/spider",
        children: [],
      },
    ],
  },
];
