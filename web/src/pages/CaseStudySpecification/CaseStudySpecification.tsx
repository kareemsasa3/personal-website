import CaseStudyPage from "../../components/CaseStudyPage";
import { caseStudyBlocksBySlug } from "../../data/caseStudyBlocks";
import { caseStudyBySlug } from "../../data/caseStudies";

const slug = "where-the-specification-lived";
const caseStudy = { ...caseStudyBySlug[slug], blocks: caseStudyBlocksBySlug[slug] };

const CaseStudySpecification = () => {
  return <CaseStudyPage caseStudy={caseStudy} />;
};

export default CaseStudySpecification;
