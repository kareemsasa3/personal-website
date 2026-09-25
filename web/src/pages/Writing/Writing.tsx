import { Link } from "react-router-dom";
import TypeWriterText from "../../components/TypeWriterText";
import { articlesData } from "../../data/generated/articles";
import {
  KIND_LABELS,
  formatPublished,
  formatSeriesPosition,
} from "../../utils/articleFormatting";
import "./Writing.css";

const Writing = () => {
  return (
    <div className="page-content writing-page">
      <div className="writing-container">
        <header id="writing-overview" className="writing-header prose-surface">
          <p className="writing-eyebrow">Long-form</p>
          <h1>
            <TypeWriterText text="Writing" speed={60} />
          </h1>
          <p>
            Essays and field notes on constraints, coordination, and systems
            that can explain themselves. Each piece is published with its
            sources and the record of how its claims were verified.
          </p>
        </header>

        <section id="writing-list" className="writing-grid">
          {articlesData.map((article) => (
            <Link
              key={article.slug}
              to={`/writing/${article.slug}`}
              className="writing-card interactive-card"
            >
              <p className="writing-card-eyebrow">{KIND_LABELS[article.kind]}</p>
              {article.series ? (
                <p className="writing-card-series">
                  {article.series.name} · {formatSeriesPosition(article.series)}
                </p>
              ) : null}
              <h2>{article.title}</h2>
              {article.subtitle ? (
                <p className="writing-card-subtitle">{article.subtitle}</p>
              ) : null}
              {article.showDescriptionOnCard !== false ? (
                <p className="writing-card-description">
                  {article.description}
                </p>
              ) : null}
              <p className="writing-card-meta">
                <time dateTime={article.published}>
                  {formatPublished(article.published)}
                </time>
                <span aria-hidden="true"> · </span>
                <span>{article.readingMinutes} min read</span>
              </p>
              <span className="writing-card-link">Read →</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Writing;
