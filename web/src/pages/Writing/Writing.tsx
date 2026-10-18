import { Link } from "react-router-dom";
import { articlesData } from "../../data/generated/articles";
import {
  KIND_LABELS,
  formatPublished,
  formatSeriesPosition,
} from "../../utils/articleFormatting";
import "./Writing.css";

const Writing = () => {
  return (
    <div className="page-content writing-page df-body">
      <div className="writing-container">
        <header id="writing-overview" className="writing-header prose-surface prose-surface--start">
          <p className="writing-eyebrow df-label">Long-form</p>
          <h1 className="df-heading-1">
            Writing
          </h1>
          <p className="df-body-lg">
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
              className="writing-card interactive-card df-control df-control--card df-body-sm"
            >
              <p className="writing-card-eyebrow df-label">{KIND_LABELS[article.kind]}</p>
              {article.series ? (
                <p className="writing-card-series df-body-sm">
                  {article.series.name} · {formatSeriesPosition(article.series)}
                </p>
              ) : null}
              <h2 className="df-heading-3">{article.title}</h2>
              {article.subtitle ? (
                <p className="writing-card-subtitle df-body-sm">{article.subtitle}</p>
              ) : null}
              {article.showDescriptionOnCard !== false ? (
                <p className="writing-card-description df-body-sm">
                  {article.description}
                </p>
              ) : null}
              <p className="writing-card-meta df-data">
                <time dateTime={article.published}>
                  {formatPublished(article.published)}
                </time>
                <span aria-hidden="true"> · </span>
                <span>{article.readingMinutes} min read</span>
              </p>
              <span className="writing-card-link df-label">Read →</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Writing;
