import { useState, type KeyboardEvent } from 'react';
import { CTL_LIMITS } from '../../../src/index.js';
import { apiEntries, guarantees, workflowSteps } from '../data.js';
import { CopyButton } from './Controls.js';
import { Icon } from './Icons.js';

const apiGuideUrl = 'https://github.com/lcherone/ctl2/blob/main/docs/API.md';
const repositoryUrl = 'https://github.com/lcherone/ctl2';

export function HowItWorks() {
  return (
    <section aria-labelledby="workflow-title" className="light-section workflow-section" id="how-it-works">
      <div className="section-inner">
        <p className="section-label">How CTL2 works</p>
        <h2 id="workflow-title">How CTL2 works.</h2>
        <div className="workflow-rail">
          {workflowSteps.map((step, index) => (
            <article className={index === 0 ? 'workflow-step is-active' : 'workflow-step'} key={step.number}>
              <div className="step-title"><span>{step.number}</span><h3>{step.title}</h3><i /></div>
              <p>{step.description}</p>
              <pre><code>{step.code}</code></pre>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GuaranteesAndLimits() {
  const limits = [
    ['Encoded payload', `${CTL_LIMITS.maxPayloadBytes.toLocaleString('en')} B`],
    ['Decoded task text', `${CTL_LIMITS.maxDecodedBytes.toLocaleString('en')} B`],
    ['Dictionary entries', CTL_LIMITS.maxDictionaryEntries.toLocaleString('en')],
    ['List items', CTL_LIMITS.maxListItems.toLocaleString('en')],
    ['Dictionary references', CTL_LIMITS.maxDictionaryReferences.toLocaleString('en')]
  ];

  return (
    <section aria-labelledby="guarantees-title" className="dark-section guarantees-section">
      <div className="section-inner guarantees-layout">
        <div>
          <p className="section-label">Why CTL2</p>
          <h2 id="guarantees-title">Built for exact handovers.</h2>
          <dl className="guarantee-list">
            {guarantees.map(([title, description]) => (
              <div key={title}><dt>{title}</dt><dd>{description}</dd></div>
            ))}
          </dl>
        </div>
        <div className="limits-block">
          <h3>Resource limits</h3>
          <table>
            <caption className="visually-hidden">Fixed CTL2 resource limits</caption>
            <tbody>
              {limits.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function ApiExplorer() {
  const [selectedName, setSelectedName] = useState(apiEntries[0]?.name ?? 'encode');
  const selected = apiEntries.find((entry) => entry.name === selectedName) ?? apiEntries[0];
  if (!selected) return null;

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % apiEntries.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + apiEntries.length) % apiEntries.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = apiEntries.length - 1;
    else return;

    event.preventDefault();
    const nextEntry = apiEntries[nextIndex];
    if (!nextEntry) return;
    setSelectedName(nextEntry.name);
    document.getElementById(`api-${nextEntry.name}`)?.focus();
  }

  return (
    <section aria-labelledby="api-title" className="light-section api-section" id="api">
      <div className="section-inner">
        <div className="api-header">
          <div><p className="section-label">API reference</p><h2 id="api-title">Use the API you need.</h2></div>
          <div className="api-actions">
            <a className="button button-dark" href={apiGuideUrl}>Read the API guide <Icon name="external" size={17} /></a>
            <a className="button button-outline" href={repositoryUrl}>View on GitHub <Icon name="external" size={17} /></a>
          </div>
        </div>
        <div className="api-explorer">
          <div aria-label="Public API exports" className="api-index" role="tablist">
            {apiEntries.map((entry, index) => (
              <button
                aria-controls="api-panel"
                aria-selected={selected.name === entry.name}
                className={selected.name === entry.name ? 'is-selected' : undefined}
                id={`api-${entry.name}`}
                key={entry.name}
                onClick={() => setSelectedName(entry.name)}
                onKeyDown={(event) => handleTabKey(event, index)}
                role="tab"
                tabIndex={selected.name === entry.name ? 0 : -1}
                type="button"
              >{entry.name}</button>
            ))}
          </div>
          <div aria-labelledby={`api-${selected.name}`} className="api-detail" id="api-panel" role="tabpanel">
            <h3>{selected.signature}</h3>
            <p>{selected.description}</p>
            <div className="api-code">
              <div><span>TypeScript</span><CopyButton className="code-copy" label="Copy code" text={selected.code} /></div>
              <pre><code>{selected.code}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClosingSection() {
  return (
    <section className="closing-section">
      <div className="section-inner closing-content">
        <h2>Make every handover explicit.</h2>
        <p>Open source, MIT licensed, and ready for Node.js 18+ or modern browsers.</p>
        <a className="button button-accent" href="#playground">Start in the playground <Icon name="arrow" /></a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="section-inner footer-content">
        <strong>CTL2</strong>
        <nav aria-label="Footer navigation">
          <a href="https://github.com/lcherone/ctl2/tree/main/docs">Documentation</a>
          <a href={repositoryUrl}>GitHub</a>
          <a href="https://github.com/lcherone/ctl2/blob/main/LICENSE">MIT License</a>
        </nav>
      </div>
    </footer>
  );
}
