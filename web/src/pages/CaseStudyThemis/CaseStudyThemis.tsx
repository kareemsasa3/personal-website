import CaseStudyPage from "../../components/CaseStudyPage";
import { caseStudyBlocksBySlug } from "../../data/caseStudyBlocks";
import { caseStudyBySlug } from "../../data/caseStudies";

const slug = "themis";
const caseStudy = { ...caseStudyBySlug[slug], blocks: caseStudyBlocksBySlug[slug] };

const CaseStudyThemis = () => {
  return <CaseStudyPage caseStudy={caseStudy} />;
};

export default CaseStudyThemis;
