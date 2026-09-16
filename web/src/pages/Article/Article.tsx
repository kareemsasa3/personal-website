import { useParams } from "react-router-dom";
import ArticlePage from "../../components/ArticlePage";
import NotFound from "../NotFound";
import { articleBySlug } from "../../data/generated/articles";

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articleBySlug[slug] : undefined;

  if (!article) {
    return <NotFound />;
  }

  return <ArticlePage article={article} />;
};

export default Article;
