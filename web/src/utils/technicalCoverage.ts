const aliases: Record<string, string> = { "React 18": "React", FTS5: "SQLite FTS5" };
export const normalizeTechnicalTerm = (term: string) => aliases[term] ?? term;
export const projectTechnicalTerms = (terms: string[]) => [...new Set(terms.map(normalizeTechnicalTerm))];
