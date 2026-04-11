import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { classifyKoreanWord } from './lib/classifyWord';
import { checkKoreanTranslation } from './lib/checkKoreanTranslation';
import { generateSentenceFromVocab } from './lib/generateSentence';
import {
  addWord,
  createEmptyLibrary,
  moveWordToArchive,
  purgeArchiveEntry,
  restoreFromArchive,
  restoreSnapshot,
  type AppStateV3,
  type Library,
} from './lib/appState';
import {
  appendClassifyReport,
  clearHistory,
  loadAppState,
  loadHistory,
  prependHistory,
  removeHistoryEntry,
  saveAppState,
  type HistoryEntry,
} from './lib/storage';

/** English lines already shown this session—passed to the model to reduce repetitive prompts. */
function recentEnglishPromptsFromHistory(history: HistoryEntry[]): string[] {
  const out: string[] = [];
  for (const h of history) {
    if (out.length >= 10) break;
    const r = h.result;
    if (r.korean_reference?.trim()) {
      out.push(r.sentence.trim());
    } else if (r.english_gloss?.trim()) {
      out.push(r.english_gloss.trim());
    }
  }
  return out;
}
import { MAX_WORDS, wordListsFromBank, type StoredWord } from './lib/wordBank';
import type { SentenceGeneration } from './schema/sentenceGeneration';
import type { TranslationCheck } from './schema/translationCheck';
import type { WordClassification, WordPos } from './schema/wordClassification';
import { llmStorageKeys } from './llm/getLlmClient';
import { AboutPage, ContactPage } from './StaticPages';

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

function listsBlockedHint(lists: ReturnType<typeof wordListsFromBank>): string | null {
  const { nouns, verbs } = lists;
  if (nouns.length > 0 && verbs.length > 0) return null;
  if (nouns.length === 0 && verbs.length === 0) {
    return 'Add at least one noun and one verb to generate a sentence.';
  }
  if (nouns.length === 0) {
    return 'Add at least one noun before generating.';
  }
  return 'Add at least one verb before generating.';
}

type GridFilter = 'all' | WordPos;

type SitePage = 'home' | 'about' | 'contact';

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

/** Legacy history: Korean in `sentence`, English in `english_gloss`; no `korean_reference`. */
function isLegacySentenceResult(r: SentenceGeneration): boolean {
  if (r.korean_reference) return false;
  return /[\uAC00-\uD7AF]/.test(r.sentence);
}

function verdictLabel(v: TranslationCheck['verdict']): string {
  if (v === 'good') return 'Good match';
  if (v === 'close') return 'Close';
  return 'Needs work';
}

/** Display-only: capitalize first character of English gloss (learner-facing line). */
function capitalizeEnglishGloss(s: string): string {
  if (!s) return s;
  const c = s.charAt(0);
  const rest = s.slice(1);
  return c.toLocaleUpperCase() + rest;
}

/** Comma-separated dictionary glosses: capitalize each sense (e.g. "shape, appearance, form"). */
function formatWordEnGloss(s: string): string {
  if (!s) return s;
  return s
    .split(',')
    .map((part) => {
      const t = part.trim();
      if (!t) return '';
      return capitalizeEnglishGloss(t);
    })
    .filter(Boolean)
    .join(', ');
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

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.733 5.076A10.744 10.744 0 0 1 12 5c7 0 10 7 10 7a13.38 13.38 0 0 1-1.458 2.338M6.52 6.52A13.9 13.9 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.607" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function ToolbarPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ToolbarMoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="12" r="1.65" />
      <circle cx="12" cy="12" r="1.65" />
      <circle cx="18.5" cy="12" r="1.65" />
    </svg>
  );
}

export default function App() {
  const [appState, setAppState] = useState<AppStateV3>(() => loadAppState());
  const activeLibrary = useMemo(
    () => appState.libraries.find((l) => l.id === appState.activeLibraryId) ?? appState.libraries[0],
    [appState.libraries, appState.activeLibraryId],
  );
  const wordBank = activeLibrary?.words ?? [];

  const [wordInput, setWordInput] = useState('');
  const [gridFilter, setGridFilter] = useState<GridFilter>('all');
  const [classification, setClassification] = useState<WordClassification | null>(null);
  const [classifyBusy, setClassifyBusy] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [addHint, setAddHint] = useState<string | null>(null);

  const [byokEnabled, setByokEnabled] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyGlossVisible, setHistoryGlossVisible] = useState<Record<string, boolean>>({});
  const [practiceById, setPracticeById] = useState<Record<string, string>>({});
  const [checkById, setCheckById] = useState<Record<string, TranslationCheck | null>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [newLibraryOpen, setNewLibraryOpen] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [newLibraryError, setNewLibraryError] = useState<string | null>(null);
  const [renameLibraryOpen, setRenameLibraryOpen] = useState(false);
  const [renameLibraryName, setRenameLibraryName] = useState('');
  const [renameLibraryError, setRenameLibraryError] = useState<string | null>(null);
  const [classifyReportOpen, setClassifyReportOpen] = useState(false);
  const [classifyReportNote, setClassifyReportNote] = useState('');
  const [classifyReportThanks, setClassifyReportThanks] = useState(false);
  const [sitePage, setSitePage] = useState<SitePage>('home');

  const wordInputRef = useRef<HTMLInputElement>(null);
  const newLibraryInputRef = useRef<HTMLInputElement>(null);
  const renameLibraryInputRef = useRef<HTMLInputElement>(null);
  const libraryMenuRef = useRef<HTMLDetailsElement>(null);
  const inputSyncRef = useRef(wordInput);
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
    if (!newLibraryOpen) return;
    queueMicrotask(() => newLibraryInputRef.current?.focus());
  }, [newLibraryOpen]);

  useEffect(() => {
    if (!renameLibraryOpen) return;
    queueMicrotask(() => renameLibraryInputRef.current?.focus());
  }, [renameLibraryOpen]);

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
    setClassifyReportOpen(false);
    setClassifyReportNote('');
    setClassifyReportThanks(false);
  }, [wordInput]);

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

  const lists = useMemo(() => wordListsFromBank(wordBank), [wordBank]);

  const filteredBank = useMemo(() => {
    let rows = wordBank;
    if (gridFilter !== 'all') rows = rows.filter((w) => w.pos === gridFilter);
    return rows;
  }, [wordBank, gridFilter]);

  const canGenerate = lists.nouns.length > 0 && lists.verbs.length > 0 && !generating;
  const generateHint = useMemo(() => listsBlockedHint(lists), [lists]);

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
    const classified =
      classification && classifiedForRef.current === t && !classifyError ? classification : null;
    const enGloss = classified ? classified.en.trim() || undefined : undefined;
    const posForAdd: WordPos = classified ? classified.pos : 'noun';

    const nextLib = addWord(lib, t, posForAdd, enGloss);
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
    queueMicrotask(() => wordInputRef.current?.focus());
  }, [wordInput, classification, classifyError]);

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
    const sid = appStateRef.current.activeLibraryId;
    const lib = appStateRef.current.libraries.find((l) => l.id === sid);
    const libName = lib?.name ?? 'Library';
    setGenerating(true);
    try {
      const result = await generateSentenceFromVocab(lists, {
        recentEnglishPrompts: recentEnglishPromptsFromHistory(history),
      });
      const entry: HistoryEntry = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
        ts: Date.now(),
        result,
        libraryId: sid,
        libraryName: libName,
      };
      prependHistory(entry);
      setHistory(loadHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }, [lists, history]);

  const onCheckTranslation = useCallback(
    async (entryId: string) => {
      const text = practiceById[entryId]?.trim() ?? '';
      if (!text) return;
      const h = history.find((x) => x.id === entryId);
      const ref = h?.result.korean_reference?.trim();
      if (!h || !ref) {
        setError('This entry has no model Korean reference. Generate a new sentence to use Check.');
        return;
      }
      setCheckingId(entryId);
      setError(null);
      try {
        const out = await checkKoreanTranslation({
          englishPrompt: h.result.sentence,
          referenceKorean: ref,
          userKorean: text,
          lists,
        });
        setCheckById((prev) => ({ ...prev, [entryId]: out }));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setCheckingId(null);
      }
    },
    [history, practiceById, lists],
  );

  const removeHistoryItem = useCallback((id: string) => {
    removeHistoryEntry(id);
    setHistory(loadHistory());
    setHistoryGlossVisible((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPracticeById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCheckById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const removeWord = useCallback((id: string) => {
    updateActiveLibrary((lib) => moveWordToArchive(lib, id));
  }, [updateActiveLibrary]);

  const onSelectLibrary = useCallback((id: string) => {
    setAppState((prev) => ({ ...prev, activeLibraryId: id }));
  }, []);

  const openNewLibraryForm = useCallback(() => {
    setRenameLibraryOpen(false);
    setRenameLibraryName('');
    setRenameLibraryError(null);
    setNewLibraryError(null);
    setNewLibraryName('');
    setNewLibraryOpen(true);
  }, []);

  const cancelNewLibrary = useCallback(() => {
    setNewLibraryOpen(false);
    setNewLibraryName('');
    setNewLibraryError(null);
  }, []);

  const commitNewLibrary = useCallback(() => {
    const name = newLibraryName.trim();
    if (!name) {
      setNewLibraryError('Enter a library name before creating.');
      return;
    }
    setNewLibraryError(null);
    const lib = createEmptyLibrary(name);
    setAppState((prev) => ({
      ...prev,
      libraries: [...prev.libraries, lib],
      activeLibraryId: lib.id,
    }));
    setNewLibraryOpen(false);
    setNewLibraryName('');
  }, [newLibraryName]);

  const onNewLibraryKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelNewLibrary();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        commitNewLibrary();
      }
    },
    [cancelNewLibrary, commitNewLibrary],
  );

  const cancelRenameLibrary = useCallback(() => {
    setRenameLibraryOpen(false);
    setRenameLibraryName('');
    setRenameLibraryError(null);
  }, []);

  const commitRenameLibrary = useCallback(() => {
    const name = renameLibraryName.trim();
    if (!name) {
      setRenameLibraryError('Enter a library name.');
      return;
    }
    const id = appStateRef.current.activeLibraryId;
    setRenameLibraryError(null);
    setRenameLibraryOpen(false);
    setRenameLibraryName('');
    setAppState((prev) => ({
      ...prev,
      libraries: prev.libraries.map((l) => (l.id === id ? { ...l, name: name.slice(0, 60) } : l)),
    }));
  }, [renameLibraryName]);

  const onRenameLibraryKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelRenameLibrary();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRenameLibrary();
      }
    },
    [cancelRenameLibrary, commitRenameLibrary],
  );

  const onRenameLibrary = useCallback(() => {
    libraryMenuRef.current?.removeAttribute('open');
    setNewLibraryOpen(false);
    setNewLibraryName('');
    setNewLibraryError(null);
    const cur = appStateRef.current.libraries.find((l) => l.id === appStateRef.current.activeLibraryId);
    if (!cur) return;
    setRenameLibraryError(null);
    setRenameLibraryName(cur.name);
    setRenameLibraryOpen(true);
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

  const classifyReportEligible =
    !!classification &&
    !classifyBusy &&
    wordInput.trim().length > 0 &&
    classifiedForRef.current === wordInput.trim();

  const submitClassifyReport = useCallback(() => {
    const w = wordInput.trim();
    if (!classification || !w || classifiedForRef.current !== w) return;
    appendClassifyReport({
      word: w,
      en: classification.en,
      pos: classification.pos,
      note: classifyReportNote,
    });
    setClassifyReportThanks(true);
    setClassifyReportOpen(false);
    setClassifyReportNote('');
  }, [wordInput, classification, classifyReportNote]);

  const toggleHistoryGloss = useCallback((id: string) => {
    setHistoryGlossVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sitePage]);

  return (
    <div className="page">
      <header className="site-header">
        <nav className="site-nav" aria-label="Site sections">
          <div className="filters site-nav__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={sitePage === 'home'}
              id="tab-home"
              className={sitePage === 'home' ? 'is-active' : ''}
              onClick={() => setSitePage('home')}
            >
              Home
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sitePage === 'about'}
              id="tab-about"
              className={sitePage === 'about' ? 'is-active' : ''}
              onClick={() => setSitePage('about')}
            >
              About us
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sitePage === 'contact'}
              id="tab-contact"
              className={sitePage === 'contact' ? 'is-active' : ''}
              onClick={() => setSitePage('contact')}
            >
              Contact us
            </button>
          </div>
        </nav>
      </header>

      {sitePage === 'about' ? (
        <AboutPage />
      ) : sitePage === 'contact' ? (
        <ContactPage />
      ) : (
        <>
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
          Add with the button, or <kbd>⌘ Enter</kbd> / <kbd>Ctrl Enter</kbd> to add using the suggested role above (or noun if classification is not ready yet). Then build your library (at least one noun and one verb), generate an English prompt, type your Korean translation, and use Check for feedback.
        </p>
      </div>

      <div className="compact-toolbar compact-toolbar--library-only" role="toolbar" aria-label="Library">
        <div
          className={
            newLibraryOpen || renameLibraryOpen
              ? 'compact-toolbar__cluster compact-toolbar__cluster--stack'
              : 'compact-toolbar__cluster'
          }
        >
          <label
            className="compact-toolbar__label"
            htmlFor={
              newLibraryOpen ? 'new-library-name' : renameLibraryOpen ? 'rename-library-name' : 'library-select'
            }
          >
            Library
          </label>
          {newLibraryOpen ? (
            <>
              <div className="compact-toolbar__new-lib-row">
                <input
                  ref={newLibraryInputRef}
                  id="new-library-name"
                  type="text"
                  className="compact-toolbar__name-input"
                  value={newLibraryName}
                  onChange={(e) => {
                    setNewLibraryName(e.target.value);
                    setNewLibraryError(null);
                  }}
                  onKeyDown={onNewLibraryKeyDown}
                  placeholder="Name this library…"
                  maxLength={60}
                  autoComplete="off"
                  aria-invalid={!!newLibraryError}
                  aria-describedby={newLibraryError ? 'new-library-error' : undefined}
                />
                <div className="compact-toolbar__new-lib-actions">
                  <button type="button" className="compact-toolbar__commit-btn" onClick={commitNewLibrary}>
                    Create
                  </button>
                  <button type="button" className="compact-toolbar__cancel-btn" onClick={cancelNewLibrary}>
                    Cancel
                  </button>
                </div>
              </div>
              {newLibraryError ? (
                <p id="new-library-error" className="compact-toolbar__field-error" role="alert">
                  {newLibraryError}
                </p>
              ) : null}
            </>
          ) : renameLibraryOpen ? (
            <>
              <div className="compact-toolbar__new-lib-row">
                <input
                  ref={renameLibraryInputRef}
                  id="rename-library-name"
                  type="text"
                  className="compact-toolbar__name-input"
                  value={renameLibraryName}
                  onChange={(e) => {
                    setRenameLibraryName(e.target.value);
                    setRenameLibraryError(null);
                  }}
                  onKeyDown={onRenameLibraryKeyDown}
                  placeholder="Library name…"
                  maxLength={60}
                  autoComplete="off"
                  aria-invalid={!!renameLibraryError}
                  aria-describedby={renameLibraryError ? 'rename-library-error' : undefined}
                />
                <div className="compact-toolbar__new-lib-actions">
                  <button type="button" className="compact-toolbar__commit-btn" onClick={commitRenameLibrary}>
                    Save
                  </button>
                  <button type="button" className="compact-toolbar__cancel-btn" onClick={cancelRenameLibrary}>
                    Cancel
                  </button>
                </div>
              </div>
              {renameLibraryError ? (
                <p id="rename-library-error" className="compact-toolbar__field-error" role="alert">
                  {renameLibraryError}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <select
                id="library-select"
                className="compact-select"
                value={appState.activeLibraryId}
                onChange={(e) => onSelectLibrary(e.target.value)}
              >
                {appState.libraries.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="toolbar-icon-btn"
                onClick={openNewLibraryForm}
                title="Create library"
                aria-label="Create new library"
              >
                <ToolbarPlusIcon />
              </button>
              <details ref={libraryMenuRef} className="toolbar-menu">
                <summary className="toolbar-menu__trigger" aria-label="Library menu">
                  <ToolbarMoreIcon />
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
            </>
          )}
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
          <div className="classify-status__result">
            <div className="classify-status__row">
              <span className="classify-status__en" lang="en">
                {capitalizeEnglishGloss(classification.en)}
              </span>
              <span className="classify-status__meta">
                <PosTag pos={classification.pos} className="classify-status__pos-tag" />
                {classification.note ? ` — ${classification.note}` : ''}
              </span>
            </div>
            {classifyReportEligible ? (
              <div className="classify-status__report">
                {classifyReportThanks ? (
                  <p className="classify-status__report-thanks" role="status">
                    Thanks — we saved your note on this device for review.
                  </p>
                ) : classifyReportOpen ? (
                  <div className="classify-status__report-panel">
                    <p className="classify-status__report-hint">What looks wrong? (optional detail)</p>
                    <textarea
                      className="classify-status__report-textarea"
                      value={classifyReportNote}
                      onChange={(e) => setClassifyReportNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="e.g. Wrong English gloss, or part of speech should be different…"
                      aria-label="Report details for this suggestion"
                    />
                    <div className="classify-status__report-actions">
                      <button type="button" className="classify-status__report-submit" onClick={submitClassifyReport}>
                        Save report
                      </button>
                      <button
                        type="button"
                        className="classify-status__report-cancel"
                        onClick={() => {
                          setClassifyReportOpen(false);
                          setClassifyReportNote('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="classify-status__report-link"
                    onClick={() => setClassifyReportOpen(true)}
                  >
                    Wrong translation? Report it
                  </button>
                )}
              </div>
            ) : null}
          </div>
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

      <div className="word-controls" role="group" aria-label="Word list filters">
        <div className="word-controls__toolbar">
          <div
            className="filters word-controls__filter-pills"
            role="radiogroup"
            aria-label="Filter by part of speech"
          >
            {(
              [
                ['all', 'All'],
                ['noun', posFilterLabel('noun')],
                ['verb', posFilterLabel('verb')],
                ['adjective', posFilterLabel('adjective')],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={gridFilter === value}
                className={gridFilter === value ? 'is-active' : ''}
                onClick={() => setGridFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid">
        {filteredBank.length === 0 ? (
          <p className="grid-empty">No words in this view. Add a word above.</p>
        ) : (
          filteredBank.map((w) => (
            <article key={w.id} className="card card--streamlined" data-pos={w.pos}>
              <div className="card-top">
                <PosTag pos={w.pos} />
                <button type="button" className="icon-btn" onClick={() => removeWord(w.id)} aria-label={`Remove ${w.text}`}>
                  <RemoveIcon />
                </button>
              </div>
              <p className="word-ko">{w.text}</p>
              <p className="word-en" lang="en">
                {w.en ? formatWordEnGloss(w.en) : '—'}
              </p>
            </article>
          ))
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
            setHistoryGlossVisible({});
            setPracticeById({});
            setCheckById({});
          }}
          disabled={history.length === 0}
        >
          Clear all
        </button>
      </div>

      {history.length === 0 ? (
        <p className="history-empty">No sentences yet. Add words and generate a sentence.</p>
      ) : (
        <div className="grid history-grid">
          {history.map((h, index) => (
            <article
              key={h.id}
              className={index === 0 ? 'card card--sentence-focus' : 'card'}
            >
              <div className="card-top card-top--history">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeHistoryItem(h.id)}
                  aria-label="Remove this sentence from history"
                >
                  <RemoveIcon />
                </button>
              </div>
              {h.libraryName || h.themeLabel || index === 0 ? (
                <p className="history-meta">
                  {h.libraryName ? <span className="history-lib">{h.libraryName}</span> : null}
                  {h.themeLabel ? (
                    <span className="history-theme">
                      {h.libraryName ? ' · ' : null}
                      {h.themeLabel}
                    </span>
                  ) : null}
                  {index === 0 ? <span className="history-latest">Latest</span> : null}
                </p>
              ) : null}
              {isLegacySentenceResult(h.result) ? (
                <>
                  <p className="history-sentence" lang="ko">
                    {h.result.sentence}
                  </p>
                  {h.result.english_gloss ? (
                    <div className="history-gloss-row">
                      <button
                        type="button"
                        className="icon-btn history-gloss-toggle"
                        onClick={() => toggleHistoryGloss(h.id)}
                        aria-expanded={!!historyGlossVisible[h.id]}
                        aria-label={
                          historyGlossVisible[h.id] ? 'Hide English translation' : 'Show English translation'
                        }
                      >
                        {historyGlossVisible[h.id] ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                      {historyGlossVisible[h.id] ? (
                        <p className="history-gloss" lang="en">
                          {capitalizeEnglishGloss(h.result.english_gloss)}
                        </p>
                      ) : (
                        <p className="history-gloss-placeholder">English translation hidden.</p>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="history-prompt-label">Translate into Korean</p>
                  <p className="history-sentence history-sentence--en" lang="en">
                    {capitalizeEnglishGloss(h.result.sentence)}
                  </p>
                  <div className="history-practice">
                    <label className="field-label" htmlFor={`practice-${h.id}`}>
                      Your Korean
                    </label>
                    <textarea
                      id={`practice-${h.id}`}
                      className="field-input history-practice-input"
                      lang="ko"
                      rows={3}
                      placeholder="Type the Korean translation…"
                      value={practiceById[h.id] ?? ''}
                      onChange={(e) =>
                        setPracticeById((prev) => ({
                          ...prev,
                          [h.id]: e.target.value,
                        }))
                      }
                    />
                    <div className="history-practice-actions">
                      <button
                        type="button"
                        className="btn-ghost btn-compact"
                        disabled={
                          !practiceById[h.id]?.trim() || checkingId === h.id || !h.result.korean_reference
                        }
                        onClick={() => void onCheckTranslation(h.id)}
                      >
                        {checkingId === h.id ? 'Checking…' : 'Check translation'}
                      </button>
                    </div>
                    {checkById[h.id] ? (
                      <div className={`history-check history-check--${checkById[h.id]!.verdict}`}>
                        <p className="history-check-verdict">{verdictLabel(checkById[h.id]!.verdict)}</p>
                        <p className="history-check-feedback" lang="en">
                          {checkById[h.id]!.feedback}
                        </p>
                        {h.result.korean_reference ? (
                          <p className="history-reference" lang="ko">
                            <span className="history-reference-label">Reference: </span>
                            {h.result.korean_reference}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
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
        {wordBank.length} / {MAX_WORDS} words in “{activeLibrary?.name}” · generation uses all words in this library
      </p>
        </>
      )}
    </div>
  );
}
