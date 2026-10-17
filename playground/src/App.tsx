import { useState } from 'react';
import { BrandMark, Icon } from './components/Icons.js';
import { Playground } from './components/Playground.js';
import { ApiExplorer, ClosingSection, Footer, GuaranteesAndLimits, HowItWorks } from './components/Sections.js';

const repositoryUrl = 'https://github.com/lcherone/ctl2';

/** Complete one-page playground, documentation overview, and adoption surface. */
export function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <a aria-label="CTL2 home" className="brand" href="#top"><BrandMark /><span>CTL2</span></a>
          <nav aria-label="Primary navigation" className={menuOpen ? 'primary-nav is-open' : 'primary-nav'}>
            <a className="is-active" href="#playground" onClick={() => setMenuOpen(false)}>Playground</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#api" onClick={() => setMenuOpen(false)}>API</a>
            <a className="github-link" href={repositoryUrl}><Icon name="github" size={21} />GitHub</a>
            <a className="version-link" href={`${repositoryUrl}/releases/tag/v0.3.0`}>v0.3.0</a>
          </nav>
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            className="menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={28} />
          </button>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-inner">
            <h1>A smaller, exact handover.</h1>
            <p>Validate, encode, compare, and decode structured tasks in your browser.</p>
            <div className="hero-actions">
              <a className="button button-accent" href="#playground">Try the playground <Icon name="arrow" /></a>
              <a className="text-link" href={repositoryUrl}>View on GitHub <Icon name="external" size={18} /></a>
            </div>
          </div>
        </section>
        <Playground />
        <HowItWorks />
        <GuaranteesAndLimits />
        <ApiExplorer />
        <ClosingSection />
      </main>
      <Footer />
    </>
  );
}
