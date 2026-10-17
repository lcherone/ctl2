// @vitest-environment jsdom

import axe from 'axe-core';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from './App.js';

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null)
  });
});

afterEach(() => cleanup());

describe('CTL2 playground app', () => {
  it('renders the real encode workflow and format comparison', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'A smaller, exact handover.' })).toBeTruthy();
    expect(screen.getByText('Valid task')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Compact CTL2' })).toBeTruthy();
    expect(screen.getByText(/smaller than JSON/u)).toBeTruthy();
    expect(screen.getByText('Runs locally · Nothing leaves your browser')).toBeTruthy();
  });

  it('switches output formats and displays readable JSON', async () => {
    const user = userEvent.setup();
    render(<App />);

    const outputTabs = screen.getByRole('tablist', { name: 'Output format' });
    await user.click(within(outputTabs).getByRole('tab', { name: 'JSON' }));

    const output = screen.getByRole('tabpanel', { name: 'JSON' });
    expect(output.textContent).toContain('"version": 1');
    expect(output.textContent).toContain('"contextClassification": "public"');
  });

  it('shows strict validation feedback while the task is edited', async () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: 'Task input as JSON' });

    fireEvent.change(input, { target: { value: '{' } });

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/JSON|position|property/iu));
    expect(screen.getByText('Needs attention')).toBeTruthy();
  });

  it('moves a generated payload into decode mode and restores the task', async () => {
    const user = userEvent.setup();
    render(<App />);

    const workspaceTabs = screen.getByRole('tablist', { name: 'Playground mode' });
    await user.click(within(workspaceTabs).getByRole('tab', { name: 'Decode' }));

    expect(screen.getByRole('textbox', { name: 'Payload to decode' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Decoded task' })).toBeTruthy();
    expect(screen.getByText('Valid task')).toBeTruthy();
    expect(screen.getByText(/"title": "Fix parser error handling"/u)).toBeTruthy();
  });

  it('supports API selection, clipboard feedback, and mobile navigation state', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'compareFormats' }));
    expect(screen.getByRole('heading', { name: 'compareFormats(task)' })).toBeTruthy();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: 'decodeTransferPayload(format, payload)' })).toBeTruthy();
    await user.keyboard('{ArrowLeft}');

    const clipboardWrite = vi.spyOn(navigator.clipboard, 'writeText');
    const copyButton = screen.getByRole('button', { name: 'Copy code' });
    await user.click(copyButton);
    expect(clipboardWrite).toHaveBeenCalledWith(expect.stringContaining('compareFormats'));
    expect(screen.getByText('Copied')).toBeTruthy();

    const menuButton = screen.getByRole('button', { name: 'Open navigation' });
    await user.click(menuButton);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Close navigation' })).toBeTruthy();
  });

  it('has no automated axe violations in its initial state', async () => {
    const { container } = render(<App />);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.html)
    }))).toEqual([]);
  });
});
