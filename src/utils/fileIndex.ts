import type { IndexedFile } from '../types/island';

export interface SearchHit {
  file: IndexedFile;
  score: number;
  snippet: string;
  matchedTerms: string[];
}

export interface InvertedIndex {
  filesById: Record<string, IndexedFile>;
  postings: Record<string, Array<{ fileId: string; weight: number }>>;
  fileCount: number;
  tokenCount: number;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

export function buildFileIndex(files: IndexedFile[]): InvertedIndex {
  const filesById: Record<string, IndexedFile> = {};
  const postings: Record<string, Array<{ fileId: string; weight: number }>> = {};

  for (const file of files) {
    filesById[file.id] = file;
    const termWeights: Record<string, number> = {};

    for (const token of tokenize(file.name)) {
      termWeights[token] = (termWeights[token] ?? 0) + 5;
    }
    for (const token of tokenize(file.path)) {
      termWeights[token] = (termWeights[token] ?? 0) + 2;
    }
    for (const token of tokenize(file.content)) {
      termWeights[token] = (termWeights[token] ?? 0) + 1;
    }

    for (const [term, weight] of Object.entries(termWeights)) {
      if (!postings[term]) {
        postings[term] = [];
      }
      postings[term].push({ fileId: file.id, weight });
    }
  }

  return {
    filesById,
    postings,
    fileCount: files.length,
    tokenCount: Object.keys(postings).length,
  };
}

export function extractSnippet(content: string, queryTerms: string[], radius = 72): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (!queryTerms.length) {
    return clean.slice(0, radius * 2) + (clean.length > radius * 2 ? '…' : '');
  }

  const lower = clean.toLowerCase();
  let bestIdx = -1;
  for (const term of queryTerms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  if (bestIdx === -1) {
    return clean.slice(0, radius * 2) + (clean.length > radius * 2 ? '…' : '');
  }

  const start = Math.max(0, bestIdx - radius);
  const end = Math.min(clean.length, bestIdx + radius + 36);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < clean.length ? '…' : '';
  return `${prefix}${clean.slice(start, end)}${suffix}`;
}

export function searchIndexedFiles(
  index: InvertedIndex,
  query: string,
  options: { includeHidden: boolean; limit?: number }
): SearchHit[] {
  const { includeHidden, limit = 12 } = options;
  const trimmed = query.trim();

  const allFiles = Object.values(index.filesById).filter(
    (f) => includeHidden || !f.hidden
  );

  if (!trimmed) {
    return allFiles.slice(0, limit).map((file) => ({
      file,
      score: 1,
      snippet: extractSnippet(file.content, []),
      matchedTerms: [],
    }));
  }

  const queryTerms = tokenize(trimmed);
  if (queryTerms.length === 0) {
    return [];
  }

  const scores: Record<string, number> = {};
  const matchedByFile: Record<string, Set<string>> = {};

  for (const qTerm of queryTerms) {
    for (const [indexedTerm, entries] of Object.entries(index.postings)) {
      const isExact = indexedTerm === qTerm;
      const isPrefix = !isExact && indexedTerm.startsWith(qTerm);
      const isSubstr = !isExact && !isPrefix && qTerm.length >= 3 && indexedTerm.includes(qTerm);

      if (!isExact && !isPrefix && !isSubstr) continue;

      const multiplier = isExact ? 2.5 : isPrefix ? 1.5 : 0.8;
      for (const entry of entries) {
        const file = index.filesById[entry.fileId];
        if (!file || (!includeHidden && file.hidden)) continue;

        scores[entry.fileId] = (scores[entry.fileId] ?? 0) + entry.weight * multiplier;
        if (!matchedByFile[entry.fileId]) {
          matchedByFile[entry.fileId] = new Set();
        }
        matchedByFile[entry.fileId].add(qTerm);
      }
    }
  }

  return Object.entries(scores)
    .map(([fileId, score]) => {
      const file = index.filesById[fileId];
      const matchedTerms = Array.from(matchedByFile[fileId] ?? []);
      // Bonus when all query terms appear in the file
      const coverageBonus = matchedTerms.length === queryTerms.length ? 1.4 : 1;
      return {
        file,
        score: Number((score * coverageBonus).toFixed(2)),
        snippet: extractSnippet(file.content, queryTerms),
        matchedTerms,
      };
    })
    .sort((a, b) => b.score - a.score || a.file.name.localeCompare(b.file.name))
    .slice(0, limit);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
