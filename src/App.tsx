import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateSentenceFromVocab } from './lib/generateSentence';
import { parseWordList } from './lib/parseWordList';
import {
  clearHistory,
  loadHistory,
  loadVocab,
  prependHistory,
  saveVocab,
  type HistoryEntry,
} from './lib/storage';
import { llmStorageKeys } from './llm/getLlmClient';

export default function App() {
  const [nounsText, setNounsText] = useState('');
  const [adjectivesText, setAdjectivesText] = useState('');
  const [verbsText, setVerbsText] = useState('');
  const [byokEnabled, setByokEnabled] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const v = loadVocab();
    setNounsText(v.nounsText);
    setAdjectivesText(v.adjectivesText);
    setVerbsText(v.verbsText);
    setHistory(loadHistory());
    setByokEnabled(localStorage.getItem(llmStorageKeys.byokEnabled) === 'true');
    const k = localStorage.getItem(llmStorageKeys.apiKey);
    if (k) setApiKeyInput(k);
  }, []);

  useEffect(() => {
    saveVocab({ nounsText, adjectivesText, verbsText });
  }, [nounsText, adjectivesText, verbsText]);

  useEffect(() => {
    localStorage.setItem(llmStorageKeys.byokEnabled, byokEnabled ? 'true' : 'false');
    if (byokEnabled && apiKeyInput) {
      localStorage.setItem(llmStorageKeys.apiKey, apiKeyInput);
    }
    if (!byokEnabled) {
      localStorage.removeItem(llmStorageKeys.apiKey);
    }
  }, [byokEnabled, apiKeyInput]);

  const lists = useMemo(
    () => ({
      nouns: parseWordList(nounsText),
      adjectives: parseWordList(adjectivesText),
      verbs: parseWordList(verbsText),
    }),
    [nounsText, adjectivesText, verbsText],
  );

  const canGenerate = lists.nouns.length > 0 && lists.verbs.length > 0 && !loading;

  const onGenerate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await generateSentenceFromVocab(lists);
      const entry: HistoryEntry = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
        ts: Date.now(),
        result,
      };
      prependHistory(entry);
      setHistory(loadHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [lists]);

  return (
    <>
      <h1>Language helper</h1>
      <p className="hint">
        Add Korean vocabulary by part of speech. The model returns one Korean sentence using your words (JSON validated).
      </p>

      <section className="panel" aria-labelledby="vocab-heading">
        <h2 id="vocab-heading" className="sr-only">
          Vocabulary
        </h2>
        <label htmlFor="nouns">Nouns (one per line or comma-separated)</label>
        <textarea
          id="nouns"
          value={nounsText}
          onChange={(e) => setNounsText(e.target.value)}
          placeholder="고양이&#10;책"
        />

        <label htmlFor="adjectives">Adjectives (optional)</label>
        <textarea
          id="adjectives"
          value={adjectivesText}
          onChange={(e) => setAdjectivesText(e.target.value)}
          placeholder="빠른&#10;작은"
        />

        <label htmlFor="verbs">Verbs</label>
        <textarea id="verbs" value={verbsText} onChange={(e) => setVerbsText(e.target.value)} placeholder="달리다&#10;읽다" />

        <p className="hint">Requires at least one noun and one verb. Max ~24 tokens per category, 80 chars each.</p>

        <div className="row" style={{ marginTop: '1rem' }}>
          <button type="button" disabled={!canGenerate} onClick={() => void onGenerate()}>
            {loading ? 'Generating…' : 'Generate sentence'}
          </button>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="llm-heading">
        <h2 id="llm-heading">Model access (dev)</h2>
        <p className="hint">
          Set <span className="mono">VITE_LLM_PROXY_PATH</span> for a same-origin proxy, or{' '}
          <span className="mono">VITE_OPENAI_API_KEY</span> in <span className="mono">.env</span>, or store a key locally
          below (dev only).
        </p>
        <label className="row">
          <input
            type="checkbox"
            checked={byokEnabled}
            onChange={(e) => setByokEnabled(e.target.checked)}
          />
          <span>Store API key locally (dev only)</span>
        </label>
        {byokEnabled ? (
          <>
            <label htmlFor="api-key">API key</label>
            <input
              id="api-key"
              type="password"
              autoComplete="off"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
          </>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="history-heading">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="history-heading" style={{ margin: 0 }}>
            Recent generations
          </h2>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              clearHistory();
              setHistory([]);
            }}
          >
            Clear history
          </button>
        </div>
        {history.length === 0 ? (
          <p className="hint">No generations yet.</p>
        ) : (
          <ul className="history">
            {history.map((h) => (
              <li key={h.id}>
                <div className="result-sentence">{h.result.sentence}</div>
                {h.result.english_gloss ? <div className="hint">{h.result.english_gloss}</div> : null}
                {h.result.caveats?.length ? (
                  <div className="hint">Notes: {h.result.caveats.join(' · ')}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </>
  );
}
