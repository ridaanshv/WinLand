import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFileIndex,
  searchIndexedFiles,
  extractSnippet,
  formatFileSize,
} from './fileIndex';
import type { IndexedFile } from '../types/island';

const SAMPLE_FILES: IndexedFile[] = [
  {
    id: 'f1',
    name: 'winland-shader-pipeline.ts',
    path: 'C:\\Users\\Developer\\Projects\\WinLand\\src\\winland-shader-pipeline.ts',
    extension: 'ts',
    sizeBytes: 4820,
    modifiedAt: 'Today, 09:14',
    hidden: false,
    content: 'export function compileAcrylicShader(blurRadius: number) { return blurRadius * 2; }',
  },
  {
    id: 'f2',
    name: 'q4-benchmarks.md',
    path: 'C:\\Users\\Developer\\Documents\\q4-benchmarks.md',
    extension: 'md',
    sizeBytes: 2140,
    modifiedAt: 'Yesterday',
    hidden: false,
    content: 'Memory footprint remained under 36 MB across 120Hz OLED displays with zero frame drops.',
  },
  {
    id: 'f3',
    name: '.env.local',
    path: 'C:\\Users\\Developer\\Projects\\WinLand\\.env.local',
    extension: 'env',
    sizeBytes: 312,
    modifiedAt: '2 days ago',
    hidden: true,
    content: 'SHADER_CACHE_DIR=C:\\Temp\\WinLand\\cache',
  },
];

test('buildFileIndex indexes tokens and file counts accurately', () => {
  const index = buildFileIndex(SAMPLE_FILES);
  assert.equal(index.fileCount, 3);
  assert.ok(index.tokenCount > 10);
});

test('searchIndexedFiles ranks filename matches above body matches and respects includeHidden', () => {
  const index = buildFileIndex(SAMPLE_FILES);

  const visibleHits = searchIndexedFiles(index, 'shader', { includeHidden: false });
  assert.equal(visibleHits.length, 1);
  assert.equal(visibleHits[0].file.id, 'f1');

  const allHits = searchIndexedFiles(index, 'shader', { includeHidden: true });
  assert.equal(allHits.length, 2);
  assert.equal(allHits[0].file.id, 'f1');
  assert.equal(allHits[1].file.id, 'f3');
});

test('searchIndexedFiles supports multi-term content retrieval', () => {
  const index = buildFileIndex(SAMPLE_FILES);
  const hits = searchIndexedFiles(index, '120hz memory', { includeHidden: false });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].file.id, 'f2');
  assert.ok(hits[0].snippet.includes('Memory footprint'));
});

test('extractSnippet centers around matched keyword and formatFileSize formats cleanly', () => {
  const longText = `${'prefix '.repeat(25)}acrylic blur shader pipeline${' suffix'.repeat(25)}`;
  const snippet = extractSnippet(longText, ['acrylic'], 20);
  assert.ok(snippet.includes('acrylic'));
  assert.ok(snippet.startsWith('…'));
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(1024 * 1024 * 2.5), '2.50 MB');
});
