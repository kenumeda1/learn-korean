import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { classifyKoreanWord } from './lib/classifyWord';
import { generateSentenceFromVocab } from './lib/generateSentence';
import {
  addWord,
  createEmptyLibrary,
  moveWordToArchive,
  purgeArchiveEntry,
  restoreFromArchive,
  restoreSnapshot,
  setWordThemes,
  type AppStateV3,
  type Library,
} from './lib/appState';
import {
  clearHistory,
  loadAppState,
  loadHistory,
  prependHistory,
  saveAppState,
  type HistoryEntry,
} from './lib/storage';
import { MAX_WORDS, wordListsFromBank, wordsMatchingTheme, type StoredWord } from './lib/wordBank';
import type { WordClassification, WordPos } from './schema/wordClassification';
import { llmStorageKeys } from './llm/getLlmClient';

const CLASSIFY_DEBOUNCE_MS = 420;

const POS_LABEL: Record<WordPos, string> = {
  noun: 'Noun',
  adjective: 'Adjective',
  verb: 'Verb',
};

const POS_LABEL_KO: Record<WordPos, string> = {
  noun: '명사',
  adjective: '형용사',
  verb: '동사',
};

const POS_FILTER_EN: Record<WordPos, string> = {
  noun: 'Nouns',
  adjective: 'Adjectives',
  verb: 'Verbs',
};

function posFilterLabel(pos: WordPos): string {
  return `${POS_FILTER_EN[pos]} (${POS_LABEL_KO[pos]})`;
}

function posRoleButtonLabel(pos: WordPos): string {
  return `${POS_LABEL[pos]} (${POS_LABEL_KO[pos]})`;
}

function listsBlockedHint(
  lists: ReturnType<typeof wordListsFromBank>,
  themeLabel: string | null,
  hasActiveTheme: boolean,
): string | null {
  if (!hasActiveTheme) {
    return 'Choose a theme for generation first.';
  }
  const { nouns, verbs } = lists;
  const label = themeLabel ?? 'this theme';
  if (nouns.length > 0 && verbs.length > 0) return null;
  if (nouns.length === 0 && verbs.length === 0) {
    return `No words tagged “${label}” in this library. Tag some words with that theme, or pick another theme.`;
  }
  if (nouns.length === 0) {
    return `Add at least one noun tagged “${label}”, or tag existing nouns with that theme.`;
  }
  return `Add at least one verb tagged “${label}”, or tag existing verbs with that theme.`;
}

type GridFilter = 'all' | WordPos;

function formatHistoryTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatSnapshotTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function confidenceLabel(c: WordClassification['confidence']): string {
  if (c === 'high') return 'High confidence';
  if (c === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError') ||
    (e instanceof Error && e.name === 'AbortError')
  );
}

function tagClassForPos(pos: WordPos): string {
  if (pos === 'noun') return 'tag tag--noun';
  if (pos === 'verb') return 'tag tag--verb';
  return 'tag tag--adjective';
}

function PosTag({ pos, className }: { pos: WordPos; className?: string }) {
  return (
    <span className={`${tagClassForPos(pos)}${className ? ` ${className}` : ''}`}>
      <span className="tag__en">{POS_LABEL[pos]}</span>
      <span className="tag__sep" aria-hidden>
        {' · '}
      </span>
      <span lang="ko" className="tag__ko">
        {POS_LABEL_KO[pos]}
      </span>
    </span>
  );
}

function TranslateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 8 6 6" />
      <path d="M4 14l6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function themeLabelsForWord(word: StoredWord, presets: { id: string; label: string }[]): string {
  const parts = word.themeIds.map((id) => presets.find((p) => p.id === id)?.label).filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : '';
}

export default function App() {
  const [appState, setAppState] = useState<AppStateV3>(() => loadAppState());
  const activeLibrary = useMemo(
    () => appState.libraries.find((l) => l.id === appState.activeLibraryId) ?? appState.libraries[0],
    [appState.libraries, appState.activeLibraryId],
  );
  const wordBank = activeLibrary?.words ?? [];

  const [wordInput, setWordInput] = useState('');
  const [selectedPos, setSelectedPos] = useState<WordPos>('noun');
  const [gridFilter, setGridFilter] = useState<GridFilter>('all');
  const [themeGridFilter, setThemeGridFilter] = useState<'all' | string>('all');
  const [classification, setClassification] = useState<WordClassification | null>(null);
  const [classifyBusy, setClassifyBusy] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [addHint, setAddHint] = useState<string | null>(null);

  const [byokEnabled, setByokEnabled] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const wordInputRef = useRef<HTMLInputElement>(null);
  const inputSyncRef = useRef(wordInput);
  const userOverrodePosRef = useRef(false);
  const classifySeqRef = useRef(0);
  const classifiedForRef = useRef<string | null>(null);
  const inFlightTokenRef = useRef<string | null>(null);
  const classifyAbortRef = useRef<AbortController | null>(null);
  const appStateRef = useRef(appState);
  appStateRef.current = appState;

  useEffect(() => {
    inputSyncRef.current = wordInput;
  }, [wordInput]);

  useEffect(() => {
    setHistory(loadHistory());
    setByokEnabled(localStorage.getItem(llmStorageKeys.byokEnabled) === 'true');
    const k = localStorage.getItem(llmStorageKeys.apiKey);
    if (k) setApiKeyInput(k);
  }, []);

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  useEffect(() => {
    localStorage.setItem(llmStorageKeys.byokEnabled, byokEnabled ? 'true' : 'false');
    if (byokEnabled && apiKeyInput) {
      localStorage.setItem(llmStorageKeys.apiKey, apiKeyInput);
    }
    if (!byokEnabled) {
      localStorage.removeItem(llmStorageKeys.apiKey);
    }
  }, [byokEnabled, apiKeyInput]);

  const updateActiveLibrary = useCallback((fn: (lib: Library) => Library) => {
    setAppState((prev) => ({
      ...prev,
      libraries: prev.libraries.map((l) => (l.id === prev.activeLibraryId ? fn(l) : l)),
    }));
  }, []);

  const activeThemeLabel = useMemo(() => {
    if (!appState.activeThemeId) return null;
    return appState.themePresets.find((t) => t.id === appState.activeThemeId)?.label ?? null;
  }, [appState.activeThemeId, appState.themePresets]);

  const wordsForGeneration = useMemo(() => {
    if (!appState.activeThemeId) return [] as StoredWord[];
    return wordsMatchingTheme(wordBank, appState.activeThemeId);
  }, [wordBank, appState.activeThemeId]);

  const lists = useMemo(() => wordListsFromBank(wordsForGeneration), [wordsForGeneration]);

  const filteredBank = useMemo(() => {
    let rows = wordBank;
    if (gridFilter !== 'all') rows = rows.filter((w) => w.pos === gridFilter);
    if (themeGridFilter !== 'all') {
      rows = rows.filter((w) => w.themeIds?.includes(themeGridFilter));
    }
    return rows;
  }, [wordBank, gridFilter, themeGridFilter]);

  const canGenerate =
    !!appState.activeThemeId && lists.nouns.length > 0 && lists.verbs.length > 0 && !generating;
  const generateHint = useMemo(
    () => listsBlockedHint(lists, activeThemeLabel, !!appState.activeThemeId),
    [lists, activeThemeLabel, appState.activeThemeId],
  );

  const runClassify = useCallback(async (token: string) => {
    const t = token.trim();
    if (!t) {
      classifyAbortRef.current?.abort();
      classifyAbortRef.current = null;
      classifySeqRef.current += 1;
      setClassification(null);
      setClassifyError(null);
      setClassifyBusy(false);
      classifiedForRef.current = null;
      inFlightTokenRef.current = null;
      return;
    }
    classifyAbortRef.current?.abort();
    const ac = new AbortController();
    classifyAbortRef.current = ac;
    setClassifyError(null);
    const seq = ++classifySeqRef.current;
    inFlightTokenRef.current = t;
    setClassifyBusy(true);
    try {
      const result = await classifyKoreanWord(t, { signal: ac.signal });
      if (seq !== classifySeqRef.current) return;
      if (inputSyncRef.current.trim() !== t) return;
      setClassification(result);
      classifiedForRef.current = t;
      if (!userOverrodePosRef.current) {
        setSelectedPos(result.pos);
      }
    } catch (e) {
      if (isAbortError(e)) return;
      if (seq !== classifySeqRef.current) return;
      if (inputSyncRef.current.trim() !== t) return;
      setClassification(null);
      classifiedForRef.current = null;
      setClassifyError(e instanceof Error ? e.message : 'Could not classify.');
    } finally {
      if (seq === classifySeqRef.current) {
        setClassifyBusy(false);
        inFlightTokenRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const t = wordInput.trim();
    if (!t) {
      classifyAbortRef.current?.abort();
      classifyAbortRef.current = null;
      classifySeqRef.current += 1;
      setClassification(null);
      setClassifyError(null);
      setClassifyBusy(false);
      classifiedForRef.current = null;
      inFlightTokenRef.current = null;
      return;
    }
    const handle = window.setTimeout(() => {
      void runClassify(t);
    }, CLASSIFY_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [wordInput, runClassify]);

  const toggleWordTheme = useCallback(
    (wordId: string, themeId: string) => {
      updateActiveLibrary((lib) => {
        const w = lib.words.find((x) => x.id === wordId);
        if (!w) return lib;
        const nextIds = w.themeIds.includes(themeId)
          ? w.themeIds.filter((x) => x !== themeId)
          : [...w.themeIds, themeId];
        return setWordThemes(lib, wordId, nextIds);
      });
    },
    [updateActiveLibrary],
  );

  const handleAdd = useCallback(() => {
    const t = wordInput.trim();
    setAddHint(null);
    setError(null);
    if (!t) {
      setAddHint('Type a word first.');
      return;
    }

    const sid = appStateRef.current.activeLibraryId;
    const lib = appStateRef.current.libraries.find((l) => l.id === sid);
    if (!lib) return;

    if (lib.words.length >= MAX_WORDS) {
      setAddHint(`Word bank is full (${MAX_WORDS} words). Remove some to add more.`);
      return;
    }

    const before = lib.words.length;
    const enGloss =
      classification && classifiedForRef.current === t && !classifyError
        ? classification.en.trim() || undefined
        : undefined;

    const tid = appStateRef.current.activeThemeId;
    const tagIds = tid ? [tid] : [];
    const nextLib = addWord(lib, t, selectedPos, tagIds, enGloss);
    if (nextLib.words.length === before) {
      setAddHint('That word is already in your list with the same role.');
      return;
    }

    setAppState((prev) => ({
      ...prev,
      libraries: prev.libraries.map((l) => (l.id === sid ? nextLib : l)),
    }));

    setWordInput('');
    classifyAbortRef.current?.abort();
    classifyAbortRef.current = null;
    classifySeqRef.current += 1;
    setClassification(null);
    setClassifyError(null);
    setClassifyBusy(false);
    classifiedForRef.current = null;
    inFlightTokenRef.current = null;
    userOverrodePosRef.current = false;
    setSelectedPos('noun');
    queueMicrotask(() => wordInputRef.current?.focus());
  }, [wordInput, selectedPos, classification, classifyError]);

  const onKeyDownWord = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        handleAdd();
        return;
      }
      e.preventDefault();
      const t = wordInput.trim();
      if (!t) return;
      if (classifyBusy && inFlightTokenRef.current === t) return;
      if (!classifyBusy && classification && !classifyError && classifiedForRef.current === t) return;
      void runClassify(t);
    },
    [handleAdd, runClassify, wordInput, classifyBusy, classification, classifyError],
  );

  const onGenerate = useCallback(async () => {
    setError(null);
    const themeId = appStateRef.current.activeThemeId;
    const theme = appStateRef.current.themePresets.find((x) => x.id === themeId);
    if (!themeId || !theme) {
      setError('Choose a theme for generation first.');
      return;
    }
    const sid = appStateRef.current.activeLibraryId;
    const lib = appStateRef.current.libraries.find((l) => l.id === sid);
    const libName = lib?.name ?? 'Library';
    setGenerating(true);
    try {
      const result = await generateSentenceFromVocab(lists, { themeLabel: theme.label });
      const entry: HistoryEntry = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
        ts: Date.now(),
        result,
        libraryId: sid,
        libraryName: libName,
        themeId: theme.id,
        themeLabel: theme.label,
      };
      prependHistory(entry);
      setHistory(loadHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }, [lists]);

  const removeWord = useCallback((id: string) => {
    updateActiveLibrary((lib) => moveWordToArchive(lib, id));
  }, [updateActiveLibrary]);

  const onSelectLibrary = useCallback((id: string) => {
    setAppState((prev) => ({ ...prev, activeLibraryId: id }));
  }, []);

  const onNewLibrary = useCallback(() => {
    const name = window.prompt('Library name', 'New library')?.trim();
    if (!name) return;
    const lib = createEmptyLibrary(name);
    setAppState((prev) => ({
      ...prev,
      libraries: [...prev.libraries, lib],
      activeLibraryId: lib.id,
    }));
  }, []);

  const onRenameLibrary = useCallback(() => {
    const cur = appStateRef.current.libraries.find((l) => l.id === appStateRef.current.activeLibraryId);
    if (!cur) return;
    const name = window.prompt('Rename library', cur.name)?.trim();
    if (!name) return;
    setAppState((prev) => ({
      ...prev,
      libraries: prev.libraries.map((l) => (l.id === cur.id ? { ...l, name: name.slice(0, 60) } : l)),
    }));
  }, []);

  const onDeleteLibrary = useCallback(() => {
    const prev = appStateRef.current;
    if (prev.libraries.length < 2) {
      window.alert('Keep at least one library.');
      return;
    }
    if (!window.confirm('Delete this library and its archive? This cannot be undone.')) return;
    const removing = prev.activeLibraryId;
    const remaining = prev.libraries.filter((l) => l.id !== removing);
    setAppState({
      ...prev,
      libraries: remaining,
      activeLibraryId: remaining[0].id,
    });
  }, []);

  const onRestoreSnapshot = useCallback((snap: { ts: number; words: StoredWord[] }) => {
    if (!window.confirm('Replace the current word list with this snapshot? Current words will be saved as a new snapshot.')) return;
    updateActiveLibrary((lib) => restoreSnapshot(lib, snap));
  }, [updateActiveLibrary]);

  const snapshotsNewestFirst = useMemo(() => [...(activeLibrary?.snapshots ?? [])].reverse(), [activeLibrary]);

  return (
    <div className="page">
      <p className="eyebrow">Language helper</p>
      <h1>
        Expand your <span>vocabulary</span>
      </h1>
      <div className="hero-sub">
        <p>
          Type a Korean word. We suggest noun <span lang="ko">(명사)</span>, adjective <span lang="ko">(형용사)</span>, or verb{' '}
          <span lang="ko">(동사)</span> as you type. Press <kbd>Enter</kbd> to classify.
        </p>
        <p>
          Add with the button, or <kbd>⌘ Enter</kbd> / <kbd>Ctrl Enter</kbd> to add using the role you pick under the word box. Then build your library and generate a sentence.
        </p>
      </div>

      <div className="compact-toolbar compact-toolbar--library-only" role="toolbar" aria-label="Library">
        <div className="compact-toolbar__cluster">
          <label className="compact-toolbar__label" htmlFor="library-select">
            Library
          </label>
          <select
            id="library-select"
            className="compact-select"
            value={appState.activeLibraryId}
            onChange={(e) => onSelectLibrary(e.target.value)}
          >
            {appState.libraries.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.words.length})
              </option>
            ))}
          </select>
          <button type="button" className="toolbar-icon-btn" onClick={onNewLibrary} title="New library" aria-label="New library">
            +
          </button>
          <details className="toolbar-menu">
            <summary className="toolbar-menu__trigger" aria-label="Library menu">
              ···
            </summary>
            <div className="toolbar-menu__panel">
              <button type="button" className="toolbar-menu__item" onClick={onRenameLibrary}>
                Rename library…
              </button>
              <button type="button" className="toolbar-menu__item" onClick={onDeleteLibrary}>
                Delete library…
              </button>
            </div>
          </details>
        </div>
      </div>

      <div className="input-shell">
        <span className="input-icon" aria-hidden title="Korean input">
          <TranslateIcon />
        </span>
        <input
          ref={wordInputRef}
          id="word-input"
          type="text"
          autoComplete="off"
          maxLength={80}
          value={wordInput}
          onChange={(e) => {
            userOverrodePosRef.current = false;
            setWordInput(e.target.value);
            setAddHint(null);
          }}
          onKeyDown={onKeyDownWord}
          placeholder="Type a Korean word (e.g., 사과, 가다)…"
          aria-label="Korean word"
          aria-describedby="classify-help classify-status"
        />
        <button type="button" className="add-btn" onClick={() => handleAdd()}>
          Add Word
        </button>
      </div>
      <p id="classify-help" className="input-hint">
        Enter classifies · ⌘Enter / Ctrl+Enter adds
      </p>

      <div id="classify-status" className="classify-status" aria-live="polite" aria-atomic="true">
        {classifyBusy ? (
          <span className="classify-status__loading">Checking…</span>
        ) : classifyError ? (
          <span className="classify-status__error">{classifyError}</span>
        ) : classification ? (
          <span className="classify-status__row">
            <span className="classify-status__en" lang="en">
              {classification.en}
            </span>
            {' · '}
            Suggested role:{' '}
            <PosTag pos={classification.pos} className="classify-status__pos-tag" /> · {confidenceLabel(classification.confidence)}
            {classification.note ? ` — ${classification.note}` : ''}
          </span>
        ) : wordInput.trim() ? (
          <span className="classify-status__muted">Type or press Enter to classify.</span>
        ) : (
          <span className="classify-status__muted">Suggestion appears here after you type.</span>
        )}
      </div>

      {addHint ? (
        <p className="add-hint" role="status">
          {addHint}
        </p>
      ) : null}

      <div className="word-controls" role="group" aria-label="Filters and part of speech when adding">
        <div className="word-controls__cluster">
          <label className="word-controls__label" htmlFor="filter-pos">
            Show
          </label>
          <select
            id="filter-pos"
            className="compact-select"
            value={gridFilter}
            onChange={(e) => setGridFilter(e.target.value as GridFilter)}
            aria-label="Filter by part of speech"
          >
            <option value="all">All types</option>
            <option value="noun">{posFilterLabel('noun')}</option>
            <option value="verb">{posFilterLabel('verb')}</option>
            <option value="adjective">{posFilterLabel('adjective')}</option>
          </select>
          <select
            id="filter-theme"
            className="compact-select"
            value={themeGridFilter}
            onChange={(e) => {
              const v = e.target.value;
              setThemeGridFilter(v);
              if (v !== 'all') {
                setAppState((s) => ({ ...s, activeThemeId: v }));
              }
            }}
            aria-label="Filter by theme; choosing a theme also selects it for new words and sentence generation"
          >
            <option value="all">All themes</option>
            {appState.themePresets.map((th) => (
              <option key={th.id} value={th.id}>
                {th.label}
              </option>
            ))}
          </select>
        </div>
        <div className="word-controls__cluster">
          <label className="word-controls__label" htmlFor="add-role">
            Add as
          </label>
          <select
            id="add-role"
            className="compact-select"
            value={selectedPos}
            onChange={(e) => {
              userOverrodePosRef.current = true;
              setSelectedPos(e.target.value as WordPos);
            }}
            aria-label="Part of speech when adding"
          >
            <option value="noun">{posRoleButtonLabel('noun')}</option>
            <option value="adjective">{posRoleButtonLabel('adjective')}</option>
            <option value="verb">{posRoleButtonLabel('verb')}</option>
          </select>
        </div>
      </div>

      <div className="grid">
        {filteredBank.length === 0 ? (
          <p className="grid-empty">No words in this view. Add a word above or widen filters.</p>
        ) : (
          filteredBank.map((w) => {
            const themeLine = themeLabelsForWord(w, appState.themePresets);
            return (
              <article key={w.id} className="card card--streamlined" data-pos={w.pos}>
                <div className="card-top">
                  <PosTag pos={w.pos} />
                  <button type="button" className="icon-btn" onClick={() => removeWord(w.id)} aria-label={`Remove ${w.text}`}>
                    <RemoveIcon />
                  </button>
                </div>
                <p className="word-ko">{w.text}</p>
                <p className="word-en" lang="en">
                  {w.en ?? '—'}
                </p>
                <p className="card-tags-preview">
                  {themeLine ? themeLine : <span className="card-tags-preview--empty">Untagged</span>}
                </p>
                <details className="card-tags">
                  <summary className="card-tags__summary">Tags</summary>
                  <div className="card-tags__chips" role="group" aria-label={`Edit themes for ${w.text}`}>
                    {appState.themePresets.map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        className={`theme-chip${w.themeIds.includes(th.id) ? ' theme-chip--on' : ''}`}
                        aria-pressed={w.themeIds.includes(th.id)}
                        onClick={() => toggleWordTheme(w.id, th.id)}
                      >
                        {th.label}
                      </button>
                    ))}
                  </div>
                </details>
              </article>
            );
          })
        )}
      </div>

      <button
        type="button"
        className={`generate-btn${generating ? ' generate-btn--loading' : ''}`}
        disabled={!canGenerate}
        aria-describedby={!generating && generateHint ? 'generate-hint' : undefined}
        onClick={() => void onGenerate()}
      >
        {generating ? 'Generating sentence…' : 'Generate sentence'}
      </button>

      {!generating && generateHint ? (
        <p className="generate-hint" id="generate-hint">
          {generateHint}
        </p>
      ) : null}

      {error ? (
        <p className="alert-error" role="alert">
          {error}
        </p>
      ) : null}

      <details className="library-tools">
        <summary>
          Library backup · {activeLibrary?.snapshots.length ?? 0} snapshots · {activeLibrary?.archive.length ?? 0} archived
        </summary>
        <div className="library-tools__body">
          <section className="library-tools__section">
            <h3 className="library-tools__h">Snapshots</h3>
            <p className="library-tools__hint">Auto-saved when your word list changes (last 25).</p>
            <ul className="snapshots-list">
              {snapshotsNewestFirst.length === 0 ? (
                <li className="snapshots-empty">None yet.</li>
              ) : (
                snapshotsNewestFirst.map((s) => (
                  <li key={s.ts} className="snapshots-item">
                    <span>
                      {formatSnapshotTime(s.ts)} · {s.words.length} words
                    </span>
                    <button type="button" className="btn-ghost btn-compact" onClick={() => onRestoreSnapshot(s)}>
                      Restore
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
          <section className="library-tools__section">
            <h3 className="library-tools__h">Archive</h3>
            <p className="library-tools__hint">Removed words stay here until you restore or delete.</p>
            <ul className="archive-list archive-list--embedded">
              {(activeLibrary?.archive ?? []).length === 0 ? (
                <li className="archive-empty">Empty.</li>
              ) : (
                (activeLibrary?.archive ?? []).map((a) => (
                  <li key={a.id} className="archive-item">
                    <span className="archive-word" lang="ko">
                      {a.text}
                    </span>
                    <PosTag pos={a.pos} />
                    <button
                      type="button"
                      className="btn-ghost btn-compact"
                      onClick={() => updateActiveLibrary((lib) => restoreFromArchive(lib, a.id))}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-compact btn-danger"
                      onClick={() => updateActiveLibrary((lib) => purgeArchiveEntry(lib, a.id))}
                    >
                      Delete
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </details>

      <h2 className="section-heading">Recent sentences</h2>
      <div className="section-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            clearHistory();
            setHistory([]);
          }}
          disabled={history.length === 0}
        >
          Clear all
        </button>
      </div>

      {history.length === 0 ? (
        <p className="history-empty">No sentences yet. Tag words, pick a theme, and generate.</p>
      ) : (
        <div className="grid">
          {history.map((h, index) => (
            <article key={h.id} className="card">
              <div className="card-top">
                <span className="tag tag--sentence">Sentence</span>
              </div>
              <p className="history-meta">
                {formatHistoryTime(h.ts)}
                {h.libraryName || h.themeLabel ? (
                  <>
                    {' · '}
                    {h.libraryName ? <span className="history-lib">{h.libraryName}</span> : null}
                    {h.themeLabel ? (
                      <span className="history-theme">
                        {h.libraryName ? ' · ' : ''}
                        {h.themeLabel}
                      </span>
                    ) : null}
                  </>
                ) : null}
                {index === 0 ? <span className="history-latest">Latest</span> : null}
              </p>
              <p className="history-sentence" lang="ko">
                {h.result.sentence}
              </p>
              {h.result.english_gloss ? <p className="history-gloss">{h.result.english_gloss}</p> : null}
              {h.result.caveats?.length ? <p className="history-caveats">Notes: {h.result.caveats.join(' · ')}</p> : null}
            </article>
          ))}
        </div>
      )}

      <details className="settings-details">
        <summary>Model access (development)</summary>
        <div className="settings-body">
          <p className="settings-hint">
            Same-origin proxy: <span className="mono">VITE_LLM_PROXY_PATH</span>. Or put{' '}
            <span className="mono">VITE_OPENAI_API_KEY</span> or <span className="mono">VITE_ANTHROPIC_API_KEY</span> in{' '}
            <span className="mono">.env</span>. Claude (Anthropic) keys start with <span className="mono">sk-ant</span>
            {', '}the app uses Anthropic automatically when you paste one below. Local browser storage is dev only.
          </p>
          <label className="settings-check">
            <input type="checkbox" checked={byokEnabled} onChange={(e) => setByokEnabled(e.target.checked)} />
            <span>Store API key in this browser (dev only)</span>
          </label>
          {byokEnabled ? (
            <>
              <label className="field-label" htmlFor="api-key">
                API key
              </label>
              <input
                id="api-key"
                className="field-input"
                type="password"
                autoComplete="off"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </>
          ) : null}
        </div>
      </details>

      <p className="note">
        {wordBank.length} / {MAX_WORDS} words in “{activeLibrary?.name}” · generation uses words tagged “{activeThemeLabel ?? '—'}”
      </p>
    </div>
  );
}
