export function AboutPage() {
  return (
    <div className="static-page">
      <h1 className="section-heading static-page__title">About Language Helper</h1>
      <div className="static-page__body">
        <p>
          Language Helper is a workspace for Korean learners: build themed vocabulary libraries, get part-of-speech
          hints as you add words, generate English prompts from your bank, and practice by translating into Korean with
          structured feedback.
        </p>
        <p>
          Your word lists and session history stay in this browser. We designed it as a single-page studio tool with
          Fluent Sky surfaces: clear hierarchy, generous tap targets, and no clutter.
        </p>
      </div>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="static-page">
      <h1 className="section-heading static-page__title">Support</h1>
      <div className="static-page__body">
        <p>
          For bug reports, feature ideas, or questions about this app, reach out through whatever channel you use to work
          with the project maintainer (for example your team chat or repository issues).
        </p>
        <p className="static-page__hint">
          This build does not include a hosted support inbox. If you add one later, replace this section with your support
          email or form link.
        </p>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="static-page">
      <h1 className="section-heading static-page__title">Terms of use</h1>
      <div className="static-page__body">
        <p>
          Language Helper is provided as-is for personal learning. Replace this section with terms your lawyer approves:
          acceptable use, disclaimers, and limitation of liability for this local-first web app.
        </p>
        <p className="static-page__hint">
          This is placeholder copy only—not legal advice.
        </p>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="static-page">
      <h1 className="section-heading static-page__title">Privacy</h1>
      <div className="static-page__body">
        <p>
          Vocabulary, libraries, and practice history are stored in your browser (for example via localStorage) unless
          you configure optional model access in development. We do not operate a default cloud account for this build.
        </p>
        <p>
          If you add analytics, accounts, or a backend later, update this page to describe what you collect, why, and how
          users can exercise their rights.
        </p>
        <p className="static-page__hint">
          This is placeholder copy only—review with counsel before production.
        </p>
      </div>
    </div>
  );
}
