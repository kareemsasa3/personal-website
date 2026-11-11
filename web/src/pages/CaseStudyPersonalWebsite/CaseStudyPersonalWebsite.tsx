import CaseStudyPage from "../../components/CaseStudyPage";
import { caseStudyBlocksBySlug } from "../../data/caseStudyBlocks";
import { caseStudyBySlug } from "../../data/caseStudies";

const slug = "personal-website";
const caseStudy = { ...caseStudyBySlug[slug], blocks: caseStudyBlocksBySlug[slug] };

const CaseStudyPersonalWebsite = () => {
  return <CaseStudyPage caseStudy={caseStudy} />;
};

export default CaseStudyPersonalWebsite;
