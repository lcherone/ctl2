import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icons.js';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  idPrefix: string;
}

/** Accessible arrow-key-aware segmented tab control. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  idPrefix
}: SegmentedControlProps<T>) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + options.length) % options.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % options.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = options.length - 1;
    const option = options[nextIndex];
    if (!option) return;
    onChange(option.value);
    document.getElementById(`${idPrefix}-${option.value}`)?.focus();
  }

  return (
    <div aria-label={label} className="segmented-control" role="tablist">
      {options.map((option, index) => (
        <button
          aria-selected={value === option.value}
          className={value === option.value ? 'is-selected' : undefined}
          id={`${idPrefix}-${option.value}`}
          key={option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          role="tab"
          tabIndex={value === option.value ? 0 : -1}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/** Copies playground output while exposing confirmation to assistive tech. */
export function CopyButton({ text, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className={className ?? 'utility-button'} onClick={handleCopy} type="button">
      <Icon name="copy" size={18} />
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}

interface ActionButtonProps {
  children: ReactNode;
  icon?: 'document' | 'reset';
  onClick: () => void;
  compactLabel?: string;
}

/** Consistent secondary action used by the playground toolbar. */
export function ActionButton({ children, icon, onClick, compactLabel }: ActionButtonProps) {
  return (
    <button className="utility-button" onClick={onClick} title={compactLabel} type="button">
      {icon ? <Icon name={icon} size={19} /> : null}
      <span>{children}</span>
    </button>
  );
}

interface CodeEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  wrap?: 'off' | 'soft';
}

/** Monospaced textarea with a synchronized line-number gutter. */
export function CodeEditor({ id, label, value, onChange, invalid = false, wrap = 'off' }: CodeEditorProps) {
  const gutterRef = useRef<HTMLPreElement>(null);
  const lineCount = value.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');

  return (
    <div className={`code-editor${invalid ? ' is-invalid' : ''}`}>
      <pre aria-hidden="true" className="line-numbers" ref={gutterRef}>{lineNumbers}</pre>
      <textarea
        aria-invalid={invalid}
        aria-label={label}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
        }}
        spellCheck={false}
        value={value}
        wrap={wrap}
      />
    </div>
  );
}
