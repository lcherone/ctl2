import { useDeferredValue, useMemo, useState } from 'react';
import type { FormatComparison, TransferFormat } from '../../../src/index.js';
import { resetTask, sampleTask } from '../data.js';
import {
  compactSavings,
  decodePlaygroundPayload,
  formatTask,
  parseTaskJson,
  type ParsedTask
} from '../lib/playground.js';
import { ActionButton, CodeEditor, CopyButton, SegmentedControl } from './Controls.js';

type WorkspaceMode = 'encode' | 'decode';
type OutputMode = 'compact' | 'abstract' | 'json';

const workspaceOptions = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' }
] as const;

const outputOptions = [
  { value: 'compact', label: 'Compact CTL2' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'json', label: 'JSON' }
] as const;

const decodeOptions = [
  { value: 'ctl', label: 'CTL2' },
  { value: 'ctl-abstract', label: 'Abstract' },
  { value: 'json', label: 'JSON' }
] as const;

const initialTaskText = formatTask(sampleTask);
const resetTaskText = formatTask(resetTask);
const initialTaskResult = parseTaskJson(initialTaskText);
const initialPayload = initialTaskResult.valid ? initialTaskResult.comparison.ctl : '';

function outputForMode(result: ParsedTask, mode: OutputMode): string {
  if (!result.valid) return '';
  if (mode === 'compact') return result.comparison.ctl;
  if (mode === 'abstract') return result.comparison.abstractCtl;
  return formatTask(result.task);
}

function payloadForFormat(comparison: FormatComparison, format: TransferFormat): string {
  if (format === 'ctl') return comparison.ctl;
  if (format === 'ctl-abstract') return comparison.abstractCtl;
  return comparison.json;
}

function formatBytes(bytes: number): string {
  return `${new Intl.NumberFormat('en').format(bytes)} B`;
}

interface MetricsProps {
  comparison: FormatComparison;
}

function Metrics({ comparison }: MetricsProps) {
  const maximum = Math.max(comparison.ctlBytes, comparison.abstractCtlBytes, comparison.jsonBytes);
  const metrics = [
    ['Compact CTL2', comparison.ctlBytes, 'accent'],
    ['Abstract CTL2', comparison.abstractCtlBytes, 'ink'],
    ['JSON', comparison.jsonBytes, 'ink']
  ] as const;
  const savings = compactSavings(comparison);

  return (
    <footer className="metrics" aria-label="UTF-8 byte comparison">
      {metrics.map(([label, bytes, tone]) => (
        <div className="metric" key={label}>
          <div className="metric-heading">
            <span>{label}</span>
            <strong>{formatBytes(bytes)}</strong>
          </div>
          <div aria-hidden="true" className="metric-track">
            <span className={`metric-fill is-${tone}`} style={{ width: `${Math.max(5, Math.round((bytes / maximum) * 100))}%` }} />
          </div>
        </div>
      ))}
      <div className="savings">
        <strong>{savings}% smaller than JSON</strong>
        <span>Runs locally · Nothing leaves your browser</span>
      </div>
    </footer>
  );
}

/** Full encode/decode workbench backed by the package's public browser API. */
export function Playground() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('encode');
  const [outputMode, setOutputMode] = useState<OutputMode>('compact');
  const [taskInput, setTaskInput] = useState(initialTaskText);
  const [decodeFormat, setDecodeFormat] = useState<TransferFormat>('ctl');
  const [payloadInput, setPayloadInput] = useState(initialPayload);

  const deferredTaskInput = useDeferredValue(taskInput);
  const deferredPayloadInput = useDeferredValue(payloadInput);
  const encodeResult = useMemo(() => parseTaskJson(deferredTaskInput), [deferredTaskInput]);
  const decodeResult = useMemo(
    () => decodePlaygroundPayload(decodeFormat, deferredPayloadInput),
    [decodeFormat, deferredPayloadInput]
  );
  const output = outputForMode(encodeResult, outputMode);

  function selectWorkspace(nextMode: WorkspaceMode) {
    if (nextMode === 'decode') {
      const current = parseTaskJson(taskInput);
      if (current.valid) {
        const nextFormat: TransferFormat = outputMode === 'compact' ? 'ctl' : outputMode === 'abstract' ? 'ctl-abstract' : 'json';
        setDecodeFormat(nextFormat);
        setPayloadInput(payloadForFormat(current.comparison, nextFormat));
      }
    }
    setWorkspaceMode(nextMode);
  }

  function selectDecodeFormat(nextFormat: TransferFormat) {
    setDecodeFormat(nextFormat);
    const current = parseTaskJson(taskInput);
    if (current.valid) setPayloadInput(payloadForFormat(current.comparison, nextFormat));
  }

  function loadExample() {
    setTaskInput(initialTaskText);
    const example = parseTaskJson(initialTaskText);
    if (workspaceMode === 'decode' && example.valid) {
      setPayloadInput(payloadForFormat(example.comparison, decodeFormat));
    }
  }

  function reset() {
    if (workspaceMode === 'encode') setTaskInput(resetTaskText);
    else setPayloadInput('');
  }

  const encodePending = deferredTaskInput !== taskInput;
  const decodePending = deferredPayloadInput !== payloadInput;
  const inputValid = workspaceMode === 'encode' ? encodeResult.valid : decodeResult.valid;
  const inputPending = workspaceMode === 'encode' ? encodePending : decodePending;
  const inputError = workspaceMode === 'encode'
    ? (encodeResult.valid ? '' : encodeResult.error)
    : (decodeResult.valid ? '' : decodeResult.error);

  return (
    <section aria-labelledby="playground-title" className="playground-shell" id="playground">
      <h2 className="visually-hidden" id="playground-title">Interactive CTL2 playground</h2>
      <div className="workbench">
        <header className="workbench-toolbar">
          <SegmentedControl
            idPrefix="workspace"
            label="Playground mode"
            onChange={selectWorkspace}
            options={workspaceOptions}
            value={workspaceMode}
          />
          <div className="toolbar-actions">
            <ActionButton compactLabel="Load example" icon="document" onClick={loadExample}>
              <span className="desktop-label">Load example</span><span className="mobile-label">Example</span>
            </ActionButton>
            <ActionButton compactLabel="Reset" icon="reset" onClick={reset}>Reset</ActionButton>
          </div>
        </header>

        {workspaceMode === 'encode' ? (
          <div className="workbench-grid" role="tabpanel" aria-labelledby="workspace-encode">
            <section className="editor-pane input-pane" aria-labelledby="task-input-heading">
              <div className="pane-heading">
                <h3 id="task-input-heading">Task input</h3>
                <span className={`validation-status${inputValid ? ' is-valid' : ' is-invalid'}`}>
                  <span className="status-dot" />
                  {inputPending ? 'Checking…' : inputValid ? 'Valid task' : 'Needs attention'}
                </span>
              </div>
              <CodeEditor
                id="task-input"
                invalid={!inputValid}
                label="Task input as JSON"
                onChange={setTaskInput}
                value={taskInput}
              />
              {!inputValid && !inputPending ? <p className="input-error" role="alert">{inputError}</p> : null}
            </section>

            <section className="editor-pane output-pane" aria-labelledby="encoded-output-heading">
              <div className="pane-heading output-heading">
                <h3 id="encoded-output-heading">Encoded output</h3>
                <SegmentedControl
                  idPrefix="output"
                  label="Output format"
                  onChange={setOutputMode}
                  options={outputOptions}
                  value={outputMode}
                />
                <CopyButton text={output} />
              </div>
              <pre className="output-code" id="encoded-output" role="tabpanel" aria-labelledby={`output-${outputMode}`}>
                {output || 'Fix the task input to generate output.'}
              </pre>
            </section>
          </div>
        ) : (
          <div className="workbench-grid" role="tabpanel" aria-labelledby="workspace-decode">
            <section className="editor-pane input-pane" aria-labelledby="payload-input-heading">
              <div className="pane-heading output-heading">
                <h3 id="payload-input-heading">Transfer payload</h3>
                <SegmentedControl
                  idPrefix="decode-format"
                  label="Payload format"
                  onChange={selectDecodeFormat}
                  options={decodeOptions}
                  value={decodeFormat}
                />
              </div>
              <CodeEditor
                id="payload-input"
                invalid={!inputValid}
                label="Payload to decode"
                onChange={setPayloadInput}
                value={payloadInput}
                wrap="soft"
              />
              {!inputValid && !inputPending ? <p className="input-error" role="alert">{inputError}</p> : null}
            </section>

            <section className="editor-pane output-pane" aria-labelledby="decoded-output-heading">
              <div className="pane-heading">
                <h3 id="decoded-output-heading">Decoded task</h3>
                <span className={`validation-status${inputValid ? ' is-valid' : ' is-invalid'}`}>
                  <span className="status-dot" />
                  {inputPending ? 'Checking…' : inputValid ? 'Valid task' : 'Decode failed'}
                </span>
                <CopyButton text={decodeResult.valid ? decodeResult.formatted : ''} />
              </div>
              <pre className="output-code">
                {decodeResult.valid ? decodeResult.formatted : 'Enter a valid payload to restore the task.'}
              </pre>
            </section>
          </div>
        )}

        {encodeResult.valid ? <Metrics comparison={encodeResult.comparison} /> : (
          <footer className="metrics metrics-empty">
            <strong>{workspaceMode === 'encode' ? 'Byte comparison waits for a valid task.' : 'Strict decoding validates the complete task contract.'}</strong>
            <span>Runs locally · Nothing leaves your browser</span>
          </footer>
        )}
      </div>
    </section>
  );
}
