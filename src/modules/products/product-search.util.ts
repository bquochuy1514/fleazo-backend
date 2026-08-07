import { normalizeSearchText } from '../../common/utils/normalize-search-text.util';

export type SearchableCategory = {
  id: number;
  name: string;
  parentId: number | null;
  children: { id: number }[];
  searchAliases: { normalizedTerm: string }[];
};

export type ProductSearchResolution = {
  normalizedKeyword: string;
  searchTokens: string[];
  categoryIds?: number[];
  categoryOnly: boolean;
};

function findPhraseStart(tokens: string[], phraseTokens: string[]) {
  for (
    let start = 0;
    start <= tokens.length - phraseTokens.length;
    start += 1
  ) {
    if (phraseTokens.every((token, index) => tokens[start + index] === token)) {
      return start;
    }
  }
  return -1;
}

export function resolveProductSearch(
  keyword: string,
  categories: SearchableCategory[],
): ProductSearchResolution {
  const normalizedKeyword = normalizeSearchText(keyword);
  const keywordTokens = normalizedKeyword.split(' ').filter(Boolean);

  const candidates = categories.flatMap((category) => [
    { category, term: normalizeSearchText(category.name) },
    ...category.searchAliases.map((alias) => ({
      category,
      term: alias.normalizedTerm,
    })),
  ]);

  const matchingCategory = candidates
    .map((candidate) => ({
      ...candidate,
      phraseTokens: candidate.term.split(' ').filter(Boolean),
    }))
    .filter(({ phraseTokens }) => phraseTokens.length > 0)
    .map((candidate) => ({
      ...candidate,
      start: findPhraseStart(keywordTokens, candidate.phraseTokens),
    }))
    .filter((candidate) => candidate.start >= 0)
    .sort((a, b) => b.phraseTokens.length - a.phraseTokens.length)[0];

  if (!matchingCategory) {
    return {
      normalizedKeyword,
      searchTokens: keywordTokens,
      categoryOnly: false,
    };
  }

  const remainingTokens = keywordTokens.filter(
    (_, index) =>
      index < matchingCategory.start ||
      index >= matchingCategory.start + matchingCategory.phraseTokens.length,
  );
  const { category } = matchingCategory;

  return {
    normalizedKeyword,
    searchTokens: remainingTokens,
    categoryIds:
      category.parentId === null
        ? category.children.map((child) => child.id)
        : [category.id],
    categoryOnly: remainingTokens.length === 0,
  };
}
