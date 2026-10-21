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
  const [activeHeading, setActiveHeading] = useState("");
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

  useEffect(() => {
    const update = () => {
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-header-measured-offset")) || 0;
      let current = article.toc[0]?.id ?? "";
      for (const entry of article.toc) {
        const heading = document.getElementById(entry.id);
        if (heading && heading.getBoundingClientRect().top <= offset + 48) current = entry.id;
      }
      setActiveHeading(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [article]);

  const seriesArticles = articlesData.filter(entry => article.series && entry.series?.slug === article.series.slug);
  const otherArticles = articlesData.filter(
    (entry) => entry.slug !== article.slug && (!article.series || entry.series?.slug !== article.series.slug)
  );
  const showToc = article.toc.length >= MIN_TOC_ENTRIES;
  const usesNumberedHeadings = article.toc.every((entry) =>
    /^\d+\.\s/.test(entry.label)
  );

  return (
    <div className="page-content article-page df-body">
      <div className="article-container">
        <p className="article-breadcrumbs df-body-sm">
          <Link className="df-control df-control--light df-label" to="/writing">Writing</Link>
          <span aria-hidden="true"> / </span>
          <span>{article.title}</span>
        </p>

        <header className="article-header prose-surface prose-surface--reading">
          <p className="article-eyebrow df-label">{KIND_LABELS[article.kind]}</p>
          {article.series ? (
            <p className="article-series df-prose df-body-sm">
              {formatSeriesPosition(article.series)} in <a href="#in-this-series">{article.series.name}</a>
            </p>
          ) : null}
          <h1 className="article-title df-heading-1">{article.title}</h1>
          {article.subtitle ? (
            <p className="article-subtitle df-body-lg">{article.subtitle}</p>
          ) : null}
          <p className="article-meta df-data">
            <time dateTime={article.published}>
              {formatPublished(article.published)}
            </time>
            <span aria-hidden="true"> · </span>
            <span>{article.readingMinutes} min read</span>
            <span> · {article.provenance.sourceCount} sources · {article.provenance.factCheckRowCount} checked claims</span>
          </p>
        </header>

        <div className="article-layout">
          {showToc ? (
            <details
              className="article-toc"
              open={isSidebarWidth}
              key={String(isSidebarWidth)}
            >
              <summary className="df-control df-control--latch df-label">Contents</summary>
              <nav aria-label="Article contents">
                <ol
                  className={
                    usesNumberedHeadings
                      ? "article-toc-list--pre-numbered"
                      : undefined
                  }
                >
                  {article.toc.map((entry) => (
                    <li key={entry.id}>
                      <a className="df-control df-control--light df-body-sm" href={`#${entry.id}`} aria-current={activeHeading === entry.id ? "location" : undefined}>{entry.label}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>
          ) : null}

          <article
            className="article-body df-prose prose-surface prose-surface--reading df-body-lg"
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
                className="article-series-link df-control"
              >
                <span className="article-series-link-label df-label">Previous</span>
                <span className="df-body">{article.series.previous.title}</span>
              </Link>
            ) : null}
            {article.series.next ? (
              <Link
                to={`/writing/${article.series.next.slug}`}
                className="article-series-link article-series-link--next df-control"
              >
                <span className="article-series-link-label df-label">Next</span>
                <span className="df-body">{article.series.next.title}</span>
              </Link>
            ) : null}
          </nav>
        ) : null}

        <section className="article-provenance prose-surface prose-surface--reading" aria-labelledby="provenance-title">
          <h2 className="df-heading-2" id="provenance-title">Provenance</h2>
          <p className="article-provenance-note df-body-sm">
            This piece is published with the material behind it: what it argues
            in brief, what it drew on, how its claims were checked, and which
            ideas are original to it.
          </p>

          <div className="article-provenance-section">
            <h3 className="df-heading-3">Abstract</h3>
            <div
              className="article-prose df-prose df-body-sm"
              dangerouslySetInnerHTML={{
                __html: article.provenance.abstractHtml,
              }}
            />
          </div>

          <details className="article-provenance-section">
            <summary className="df-control df-control--latch df-label">Sources ({article.provenance.sourceCount})</summary>
            <div
              className="article-prose df-prose-links df-body-sm"
              dangerouslySetInnerHTML={{
                __html: article.provenance.sourcesHtml,
              }}
            />
          </details>

          <details className="article-provenance-section">
            <summary className="df-control df-control--latch df-label">
              Fact-check table ({article.provenance.factCheckRowCount})
            </summary>
            <div
              className="article-prose df-prose-links df-body-sm"
              dangerouslySetInnerHTML={{
                __html: article.provenance.factCheckHtml,
              }}
            />
          </details>

          <details className="article-provenance-section">
            <summary className="df-control df-control--latch df-body-sm">Editorial note: original synthesis</summary>
            <div
              className="article-prose df-prose df-body-sm"
              dangerouslySetInnerHTML={{
                __html: article.provenance.editorialNoteHtml,
              }}
            />
          </details>
        </section>

        {seriesArticles.length > 0 && <nav id="in-this-series" className="article-footer prose-surface" aria-label="In this series">
          <h2 className="df-heading-2">In this series</h2><ol>{seriesArticles.map(entry => <li key={entry.slug}><Link to={`/writing/${entry.slug}`} aria-current={entry.slug === article.slug ? "page" : undefined}>{entry.title}</Link></li>)}</ol>
        </nav>}
        {otherArticles.length > 0 ? (
          <footer className="article-footer">
            <h2 className="df-heading-2">More writing</h2>
            <ul>
              {otherArticles.map((entry) => (
                <li key={entry.slug}>
                  <Link to={`/writing/${entry.slug}`}>{entry.title}</Link>
                  <span className="article-footer-kind">
                    <span className="df-label-sm">{KIND_LABELS[entry.kind]}</span>
                    <span className="df-data"> · {entry.readingMinutes} min</span>
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
