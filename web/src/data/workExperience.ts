export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  dates: string;
  description: string[];
  techStack: string[];
  location?: string;
  highlights?: string[];
  projects?: string[];
  type: "Full-Time" | "Consulting" | "Freelance" | "Tutoring";
}

export const workExperienceData: WorkExperience[] = [
  {
    id: "resolute-consulting",
    type: "Consulting",
    company: "Resolute Consulting Group",
    role: "Lead Software Consultant",
    dates: "Oct 2024 - Present",
    location: "Remote",
    description: [
      "Lead modernization work on business-critical software where complexity, reliability, and maintainability are active delivery risks",
      "Take ownership of systems whose feature growth has outpaced architectural clarity",
      "Stabilize frontend behavior by replacing ad-hoc state with explicit models and clearer interaction flows",
      "Consolidate backend services into maintainable domain models and more predictable operational boundaries",
    ],
    techStack: [
      "ASP.NET Core",
      "React",
      "Next.js",
      "TypeScript",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "Azure",
      "Kubernetes",
      "Docker",
      "Pulumi",
    ],
    highlights: [
      "Systems modernization",
      "Architecture stabilization",
      "Production reliability",
      "Cross-stack technical leadership",
    ],
    projects: [
      "Insurance Platform: Stabilized a tightly coupled product by replacing brittle UI state with explicit models and consolidating backend behavior into a coherent ASP.NET Core API",
      "Renewable Energy Platform: Reverse-engineered a large Kubernetes-based microservice platform, clarified environment parity, and reduced onboarding friction for contributors",
      "Energy Forecasting: Replaced manual forecasting workflows with a structured Oracle-backed pipeline for financial reporting",
      "Mining Finance: Modernized spreadsheet-driven operations into auditable data structures and more reliable business workflows",
      "Workflow Platform: Built and operate an internal multi-tenant platform that moves intake, matching, documents, billing, and payouts out of email and spreadsheets into a durable system of record",
      "Healthcare Supply Integration: Support RPA and EDI integration work for a medical-equipment supplier, including changes to cloud-hosted EDI processing and documentation that keeps the engagement recoverable",
      "Energy Website Redesign: Redesigned the corporate website for a midstream energy company in Next.js and TypeScript, focused on clear positioning and commercial credibility",
    ],
  },
  {
    id: "varsity-tutors",
    type: "Tutoring",
    company: "Varsity Tutors",
    role: "Programming Tutor",
    dates: "Oct 2023 - Oct 2024",
    location: "Remote",
    description: [
      "Provided individualized programming instruction across beginner to advanced skill levels",
      "Taught Python, JavaScript, React, and data structures and algorithms",
      "Helped students prepare for technical interviews and practical software engineering work",
      "Adapted explanations and exercises to different learning styles and experience levels",
    ],
    techStack: [
      "Python",
      "JavaScript",
      "React",
      "TypeScript",
      "Data Structures",
      "Algorithms",
    ],
    highlights: [
      "Technical interview prep",
      "Personalized instruction",
      "Strong fundamentals coaching",
    ],
  },
  {
    id: "outlier-ai",
    type: "Consulting",
    company: "Outlier AI",
    role: "AI Training Specialist",
    dates: "2022 - 2023",
    location: "Remote",
    description: [
      "Evaluated model outputs for reasoning quality, factual accuracy, and instruction adherence",
      "Identified failure modes in multi-step reasoning and ambiguous responses",
      "Provided corrective feedback to improve model behavior and output quality",
    ],
    techStack: ["AI/ML", "Reasoning Analysis", "Quality Evaluation"],
    highlights: [
      "AI response evaluation",
      "Reasoning quality analysis",
      "Model feedback loops",
    ],
  },
  {
    id: "capgemini",
    type: "Consulting",
    company: "Capgemini",
    role: "Software Engineer",
    dates: "Jul 2021 - Oct 2022",
    location: "Remote",
    description: [
      "Built and maintained enterprise Java and Spring backend systems for large client engagements",
      "Delivered within large-scale CI/CD pipelines and cross-team release processes shaped by client requirements",
      "Collaborated across distributed teams and cross-functional stakeholders",
      "Contributed within agile delivery cycles for production-facing applications",
    ],
    techStack: [
      "Java",
      "Spring Boot",
      "React",
      "Angular",
      "TypeScript",
      "Node.js",
      "PostgreSQL",
      "AWS",
      "Docker",
      "Git",
    ],
    highlights: [
      "Enterprise application delivery",
      "Distributed team collaboration",
      "Enterprise backend development",
    ],
  },
];
