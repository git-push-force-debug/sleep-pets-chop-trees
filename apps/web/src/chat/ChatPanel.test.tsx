// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, ChatSession } from '../../../../packages/shared/src/api.ts';
import { initialChat } from './chatReducer.ts';
import { ChatPanel } from './ChatPanel.tsx';
import type { Chat } from './useChat.ts';

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});
afterEach(cleanup);

const session = (over: Partial<ChatSession> = {}): ChatSession => ({ id: 's1', status: 'bot', botPaused: false, ticket: null, createdAt: '', ...over });
const msg = (over: Partial<ChatMessage>): ChatMessage => ({ id: 'm', role: 'user', content: '', reply: null, agentName: null, createdAt: '2026-11-25T10:00:00Z', feedback: null, ...over });

function fakeChat(over: Partial<Chat['state']> = {}, settings: Chat['settings'] = null): Chat {
  return {
    state: { ...initialChat, ready: true, session: session(), ...over },
    settings,
    send: vi.fn(async () => {}),
    handoff: vi.fn(async () => true),
    startNew: vi.fn(async () => {}),
    feedback: vi.fn(async () => {}),
  };
}

describe('ChatPanel', () => {
  it('shows the greeting and starter questions on an empty chat', () => {
    const chat = fakeChat({}, { greeting: 'Hi, I’m Pip!', starterQuestions: ['How do I rebirth?'], offlineMessage: 'Soon', botEnabled: true });
    render(<ChatPanel chat={chat} />);
    expect(screen.getByText('Hi, I’m Pip!')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'How do I rebirth?' }));
    expect(chat.send).toHaveBeenCalledWith('How do I rebirth?');
  });

  it('sends the typed message', () => {
    const chat = fakeChat();
    render(<ChatPanel chat={chat} />);
    fireEvent.change(screen.getByLabelText('Message Pip'), { target: { value: 'how do I chop trees?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(chat.send).toHaveBeenCalledWith('how do I chop trees?');
  });

  it('shows the ticket while waiting for a person', () => {
    render(<ChatPanel chat={fakeChat({ session: session({ status: 'waiting_human', ticket: 128, botPaused: true }) })} />);
    expect(screen.getByText('Waiting for a person · Ticket #128')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Talk to a person' })).toBeNull();
  });

  it('shows a returning player the agent reply and a closed chat', () => {
    const chat = fakeChat({
      session: session({ status: 'resolved', ticket: 128 }),
      messages: [msg({ id: 'a1', role: 'agent', content: 'Fixed it — enjoy!', agentName: 'Maya' })],
    });
    render(<ChatPanel chat={chat} />);
    expect(screen.getByText('Fixed it — enjoy!')).toBeTruthy();
    expect(screen.getByText('Maya · team')).toBeTruthy();
    expect((screen.getByLabelText('Message Pip') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Start new chat' }));
    expect(chat.startNew).toHaveBeenCalled();
  });

  it('shows errors such as rate limits', () => {
    render(<ChatPanel chat={fakeChat({ error: "You're sending messages fast — try again in 60 s." })} />);
    expect(screen.getByRole('alert').textContent).toContain('try again in 60 s');
  });

  it('collects hand-off details and sends them', async () => {
    const chat = fakeChat({ messages: [msg({ id: 'u1', content: 'my gamepass is missing' })] });
    render(<ChatPanel chat={chat} />);
    fireEvent.click(screen.getByRole('button', { name: 'Talk to a person' }));
    fireEvent.change(screen.getByLabelText('Roblox username'), { target: { value: 'sleepyrancher22' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to the team' }));
    expect(chat.handoff).toHaveBeenCalledWith({ robloxUsername: 'sleepyrancher22', email: '', summary: 'my gamepass is missing' });
  });
});
