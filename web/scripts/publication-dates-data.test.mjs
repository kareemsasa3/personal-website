// Imports .ts sources, like route-metadata.test.mjs. Run with Node 22.18+ and the loader:
//   node --import ./scripts/route-metadata-test-loader.mjs --test scripts/publication-dates-data.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { caseStudiesData } from "../src/data/caseStudies.ts";
import { articlesData } from "../src/data/generated/articles.ts";
import { SITE_URL } from "../src/data/routeMetadata.ts";
import { getStructuredDataJson } from "../src/data/structuredData.ts";
import {
  isCalendarDate,
  publicationStructuredData,
  validatePublicationDates,
} from "../src/utils/publicationDates.mjs";

const nodeById = (path, id) =>
  JSON.parse(getStructuredDataJson(path))["@graph"].find((node) => node["@id"] === id);

test("every case study and essay carries valid publication dates", () => {
  const errors = [
    ...caseStudiesData.flatMap((study) =>
      validatePublicationDates(study.slug, study, { kind: "case-study" })
    ),
    ...articlesData.flatMap((article) =>
      validatePublicationDates(article.slug, article, { kind: "essay" })
    ),
  ];
  assert.deepEqual(errors, []);
});

test("case-study JSON-LD carries exactly the known dates", () => {
  for (const study of caseStudiesData) {
    const node = nodeById(`/case-studies/${study.slug}`, `${SITE_URL}/case-studies/${study.slug}#case-study`);
    assert.ok(node, study.slug);
    const expected = publicationStructuredData(study);
    assert.equal(node.datePublished, expected.datePublished, `${study.slug} datePublished`);
    assert.equal(node.dateModified, expected.dateModified, `${study.slug} dateModified`);
    for (const field of ["datePublished", "dateModified"]) {
      if (field in node) assert.ok(isCalendarDate(node[field]), `${study.slug} ${field}`);
    }
  }
});

test("article JSON-LD keeps datePublished and adds dateModified only when updated is recorded", () => {
  for (const article of articlesData) {
    const node = nodeById(`/writing/${article.slug}`, `${SITE_URL}/writing/${article.slug}#article`);
    assert.ok(node, article.slug);
    assert.equal(node.datePublished, article.published, `${article.slug} datePublished`);
    assert.equal(node.dateModified, article.updated, `${article.slug} dateModified`);
  }
});
