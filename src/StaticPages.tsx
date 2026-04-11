export function AboutPage() {
  return (
    <div className="static-page">
      <h1 className="section-heading static-page__title">About Language Helper</h1>
      <div className="static-page__body">
        <p>
          Language Helper is a calm workspace for Korean learners: build themed vocabulary libraries, get part-of-speech
          hints as you add words, generate English prompts from your bank, and practice by translating into Korean with
          structured feedback.
        </p>
        <p>
          Your word lists and session history stay in this browser unless you use optional developer settings for model
          access. We designed it as a single-page studio tool with Fluent Sky surfaces: clear hierarchy, generous tap
          targets, and no clutter.
        </p>
      </div>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="static-page">
      <h1 className="section-heading static-page__title">Contact us</h1>
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
