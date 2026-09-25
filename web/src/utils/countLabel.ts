export const pluralize = (count: number, singular: string, plural = `${singular}s`) => count === 1 ? singular : plural;
export const countLabel = (count: number, singular: string, plural?: string) => `${count} ${pluralize(count, singular, plural)}`;
