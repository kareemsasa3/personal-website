import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  articlesData,
  type Article as ArticleData,
} from "../../data/generated/articles";
import {
  KIND_LABELS,
  formatPublished,
  formatSeriesPosition,
} from "../../utils/articleFormatting";
import "./ArticlePage.css";

const MIN_TOC_ENTRIES = 5;
const TOC_SIDEBAR_QUERY = "(min-width: 1200px)";

interface ArticlePageProps {
  article: ArticleData;
}

const ArticlePage = ({ article }: ArticlePageProps) => {
  const [isSidebarWidth, setIsSidebarWidth] = useState(
    () => window.matchMedia(TOC_SIDEBAR_QUERY).matches
  );

  useEffect(() => {
    const query = window.matchMedia(TOC_SIDEBAR_QUERY);
    const handleChange = (event: MediaQueryListEvent) =>
      setIsSidebarWidth(event.matches);

    setIsSidebarWidth(query.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const otherArticles = articlesData.filter(
    (entry) => entry.slug !== article.slug
  );
  const showToc = article.toc.length >= MIN_TOC_ENTRIES;

  return (
    <div className="page-content article-page">
      <div className="article-container">
        <p className="article-breadcrumbs">
          <Link to="/writing">Writing</Link>
          <span aria-hidden="true"> / </span>
          <span>{article.title}</span>
        </p>

        <header className="article-header">
          <p className="article-eyebrow">{KIND_LABELS[article.kind]}</p>
          {article.series ? (
            <p className="article-series">
              {formatSeriesPosition(article.series)} in {article.series.name}
            </p>
          ) : null}
          <h1 className="article-title">{article.title}</h1>
          {article.subtitle ? (
            <p className="article-subtitle">{article.subtitle}</p>
          ) : null}
          <p className="article-meta">
            <time dateTime={article.published}>
              {formatPublished(article.published)}
            </time>
            <span aria-hidden="true"> · </span>
            <span>{article.readingMinutes} min read</span>
          </p>
        </header>

        <div className="article-layout">
          {showToc ? (
            <details
              className="article-toc"
              open={isSidebarWidth}
              key={String(isSidebarWidth)}
            >
              <summary>Contents</summary>
              <nav aria-label="Article contents">
                <ol>
                  {article.toc.map((entry) => (
                    <li key={entry.id}>
                      <a href={`#${entry.id}`}>{entry.label}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>
          ) : null}

          <article
            className="article-body"
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />
        </div>

        {article.series ? (
          <nav
            className="article-series-nav"
            aria-label={`${article.series.name} series`}
          >
            {article.series.previous ? (
              <Link
                to={`/writing/${article.series.previous.slug}`}
                className="article-series-link"
              >
                <span className="article-series-link-label">Previous</span>
                <span>{article.series.previous.title}</span>
              </Link>
            ) : null}
            {article.series.next ? (
              <Link
                to={`/writing/${article.series.next.slug}`}
                className="article-series-link article-series-link--next"
              >
                <span className="article-series-link-label">Next</span>
                <span>{article.series.next.title}</span>
              </Link>
            ) : null}
          </nav>
        ) : null}

        <section className="article-provenance" aria-labelledby="provenance-title">
          <h2 id="provenance-title">Provenance</h2>
          <p className="article-provenance-note">
            This piece is published with the material behind it: what it argues
            in brief, what it drew on, how its claims were checked, and which
            ideas are original to it.
          </p>

          <div className="article-provenance-section">
            <h3>Abstract</h3>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{
                __html: article.provenance.abstractHtml,
              }}
            />
          </div>

          <details className="article-provenance-section">
            <summary>Sources ({article.provenance.sourceCount})</summary>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{
                __html: article.provenance.sourcesHtml,
              }}
            />
          </details>

          <details className="article-provenance-section">
            <summary>
              Fact-check table ({article.provenance.factCheckRowCount})
            </summary>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{
                __html: article.provenance.factCheckHtml,
              }}
            />
          </details>

          <details className="article-provenance-section">
            <summary>Editorial note: original synthesis</summary>
            <div
              className="article-prose"
              dangerouslySetInnerHTML={{
                __html: article.provenance.editorialNoteHtml,
              }}
            />
          </details>
        </section>

        {otherArticles.length > 0 ? (
          <footer className="article-footer">
            <h2>More writing</h2>
            <ul>
              {otherArticles.map((entry) => (
                <li key={entry.slug}>
                  <Link to={`/writing/${entry.slug}`}>{entry.title}</Link>
                  <span className="article-footer-kind">
                    {KIND_LABELS[entry.kind]} · {entry.readingMinutes} min
                  </span>
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </div>
    </div>
  );
};

export default ArticlePage;
