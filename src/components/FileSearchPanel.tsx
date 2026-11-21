import React, { useMemo, useState } from 'react';
import {
  Search,
  FileCode2,
  FileText,
  Upload,
  Copy,
  Check,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { IndexedFile } from '../types/island';
import {
  buildFileIndex,
  formatFileSize,
  searchIndexedFiles,
} from '../utils/fileIndex';

interface FileSearchPanelProps {
  files: IndexedFile[];
  includeHidden: boolean;
  onToggleHidden: () => void;
  onIndexLocalFile: (file: IndexedFile) => void;
  onCopyToClipboard: (text: string) => void;
  onAskAi: (prompt: string) => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
}

export const FileSearchPanel: React.FC<FileSearchPanelProps> = ({
  files,
  includeHidden,
  onToggleHidden,
  onIndexLocalFile,
  onCopyToClipboard,
  onAskAi,
  onHaptic,
}) => {
  const [query, setQuery] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id ?? null);
  const [copied, setCopied] = useState(false);

  const index = useMemo(() => buildFileIndex(files), [files]);

  const { hits, lookupMs } = useMemo(() => {
    const t0 = performance.now();
    const results = searchIndexedFiles(index, query, { includeHidden, limit: 15 });
    const elapsed = Math.max(0.1, performance.now() - t0);
    return { hits: results, lookupMs: elapsed.toFixed(2) };
  }, [index, query, includeHidden]);

  const selectedFile =
    hits.find((h) => h.file.id === selectedFileId)?.file ?? hits[0]?.file ?? null;

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const ext = file.name.includes('.') ? file.name.split('.').pop() || 'txt' : 'txt';
      const newEntry: IndexedFile = {
        id: `local-${Date.now()}`,
        name: file.name,
        path: `C:\\Users\\Developer\\Imports\\${file.name}`,
        extension: ext,
        sizeBytes: file.size,
        modifiedAt: 'Just indexed',
        hidden: file.name.startsWith('.'),
        content,
      };
      onIndexLocalFile(newEntry);
      setSelectedFileId(newEntry.id);
      onHaptic('success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Search bar + index stats + add local file */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Instant indexed search by filename, path, or file content…"
            aria-label="Search indexed local files"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            onHaptic('toggle');
            onToggleHidden();
          }}
          aria-pressed={includeHidden}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
            includeHidden
              ? 'bg-[#0e241e] text-emerald-300 border border-emerald-400/25'
              : 'bg-[#14161b] text-zinc-300 hover:text-white border border-white/[0.06]'
          }`}
        >
          {includeHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>Hidden files</span>
        </button>

        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#14161b] hover:bg-[#1e222b] border border-white/10 text-xs text-zinc-200 cursor-pointer transition-colors whitespace-nowrap">
          <Upload className="w-3.5 h-3.5" />
          <span>Index Local File</span>
          <input
            type="file"
            accept=".txt,.md,.json,.ts,.tsx,.js,.css,.csv,.log,.yml,.yaml"
            onChange={handleUploadFile}
            className="sr-only"
          />
        </label>
      </div>

      {/* Clean unboxed index metadata */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
        <span>
          {hits.length} match{hits.length === 1 ? '' : 'es'} · {index.fileCount} files indexed ·{' '}
          {index.tokenCount} tokens
        </span>
        <span className="font-mono-tabular text-emerald-400">{lookupMs} ms lookup</span>
      </div>

      {/* Split results list + live content preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[250px]">
        <div className="md:col-span-5 overflow-y-auto island-scroll space-y-1.5 pr-0.5">
          {hits.length === 0 ? (
            <div className="h-full rounded-2xl bg-[#111319] border border-white/[0.05] p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-medium text-zinc-300">No indexed files found</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Try searching &quot;shader&quot;, &quot;hermes&quot;, or enable Hidden files.
              </p>
            </div>
          ) : (
            hits.map(({ file, snippet }) => {
              const active = selectedFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    onHaptic('tap');
                    setSelectedFileId(file.id);
                  }}
                  className={`w-full text-left rounded-xl p-2.5 transition-colors border ${
                    active
                      ? 'bg-[#1c202b] border-[#8ba3ff]/35 text-white'
                      : 'bg-[#12141a] hover:bg-[#171a22] border-white/[0.04] text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {['ts', 'tsx', 'json', 'js'].includes(file.extension) ? (
                      <FileCode2 className="w-3.5 h-3.5 text-[#8ba3ff] shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold truncate">{file.name}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-snug">
                    {snippet}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-500 font-mono-tabular">
                    {formatFileSize(file.sizeBytes)} · {file.modifiedAt}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="md:col-span-7 rounded-2xl bg-[#111319] border border-white/[0.06] p-3.5 flex flex-col min-h-0">
          {selectedFile ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono-tabular truncate mt-0.5">
                    {selectedFile.path}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onHaptic('success');
                      onCopyToClipboard(selectedFile.content);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1400);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onHaptic('tap');
                      onAskAi(
                        `Summarize and review the local file "${selectedFile.name}":\n\n${selectedFile.content}`
                      );
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0e241e] hover:bg-[#15352c] text-[11px] text-emerald-300 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Ask AI</span>
                  </button>
                </div>
              </div>

              <pre className="mt-2.5 flex-1 overflow-auto island-scroll text-[11px] font-mono-tabular text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                {selectedFile.content}
              </pre>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Select an indexed file to preview its retrieved content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
