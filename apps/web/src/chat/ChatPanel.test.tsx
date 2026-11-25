// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    resolve: vi.fn(async () => {}),
    markPlayed: vi.fn(),
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

  it('shows just "Pip" in the header', () => {
    render(<ChatPanel chat={fakeChat()} />);
    expect(screen.getByRole('heading', { name: 'Pip' })).toBeTruthy();
    expect(screen.queryByText(/answers from the game guide/)).toBeNull();
  });

  it('shows an in-chat ticket card while a person joins, with no offline box', () => {
    const settings = { greeting: 'Hi', starterQuestions: [], offlineMessage: 'usually within a day', botEnabled: true };
    render(<ChatPanel chat={fakeChat({ session: session({ status: 'waiting_human', ticket: 128, botPaused: true }) }, settings)} />);
    expect(screen.getAllByText('Ticket #10128')).toHaveLength(2); // header chip + card
    expect(screen.getByText('A person is joining…')).toBeTruthy();
    expect(screen.queryByText('usually within a day')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Talk to a person' })).toBeNull();
  });

  it('marks a new reply as played once it has finished animating', async () => {
    const reply = { blocks: [{ type: 'text' as const, markdown: 'Hi' }], suggestions: [], sources: [], images: [] };
    const chat = fakeChat({ messages: [msg({ id: 'b1', role: 'bot', content: 'Hi', reply })], fresh: ['b1'] });
    render(<ChatPanel chat={chat} />);
    await waitFor(() => expect(chat.markPlayed).toHaveBeenCalledWith('b1'));
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
    fireEvent.click(screen.getByRole('button', { name: 'Ask Pip something else' }));
    expect(chat.startNew).toHaveBeenCalled();
  });

  it('shows errors such as rate limits', () => {
    render(<ChatPanel chat={fakeChat({ error: "You're sending messages fast — try again in 60 s." })} />);
    expect(screen.getByRole('alert').textContent).toContain('try again in 60 s');
  });

  it('offers a person only when Pip can’t answer, then collects hand-off details', async () => {
    const reply = { blocks: [{ type: 'text' as const, markdown: 'Not in the guide.' }, { type: 'handoff' as const, reason: 'The team can check purchases.' }], suggestions: [], sources: [], images: [] };
    const chat = fakeChat({ messages: [msg({ id: 'u1', content: 'my gamepass is missing' }), msg({ id: 'b1', role: 'bot', reply, createdAt: '2026-11-25T10:00:01Z' })] });
    render(<ChatPanel chat={chat} />);
    expect(screen.queryByRole('button', { name: /Talk to a person/ })).toBeNull(); // no always-on header button
    fireEvent.click(screen.getByRole('button', { name: 'Yes, talk to a person' }));
    fireEvent.change(screen.getByLabelText('Roblox username'), { target: { value: 'sleepyrancher22' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to the team' }));
    expect(chat.handoff).toHaveBeenCalledWith({ robloxUsername: 'sleepyrancher22', email: '', summary: 'my gamepass is missing' });
  });

  it('drops the ticket card once a person replies and keeps the ticket number in the header', () => {
    const chat = fakeChat({
      session: session({ status: 'human', ticket: 4, botPaused: true }),
      messages: [msg({ id: 'a1', role: 'agent', content: 'Hi, Lance here', agentName: 'Lance' })],
    });
    render(<ChatPanel chat={chat} />);
    expect(screen.getByText('Ticket #10004')).toBeTruthy();
    expect(screen.queryByText('A person is joining…')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Resolved' }));
    expect(chat.resolve).toHaveBeenCalledWith(true);
  });

  it('shows no Resolved button before a person has replied', () => {
    render(<ChatPanel chat={fakeChat({ session: session({ status: 'waiting_human', ticket: 4, botPaused: true }) })} />);
    expect(screen.queryByRole('button', { name: 'Resolved' })).toBeNull();
  });

  it('shows reply chips only on the latest answer', () => {
    const reply = (q: string) => ({ blocks: [{ type: 'text' as const, markdown: 'Answer' }], suggestions: [q], sources: [], images: [] });
    render(<ChatPanel chat={fakeChat({ messages: [
      msg({ id: 'b1', role: 'bot', reply: reply('Old chip'), createdAt: '2026-11-25T10:00:01Z' }),
      msg({ id: 'u2', content: 'next', createdAt: '2026-11-25T10:00:02Z' }),
      msg({ id: 'b2', role: 'bot', reply: reply('New chip'), createdAt: '2026-11-25T10:00:03Z' }),
    ] })} />);
    expect(screen.queryByRole('button', { name: 'Old chip' })).toBeNull();
    expect(screen.getByRole('button', { name: 'New chip' })).toBeTruthy();
  });

  it('answers the team’s "solved?" question with Yes / No', () => {
    const reply = { blocks: [{ type: 'text' as const, markdown: 'Did this solve your problem?' }], suggestions: [], sources: [], images: [], ask: 'resolve' as const };
    const chat = fakeChat({ session: session({ status: 'human', ticket: 4, botPaused: true }), messages: [msg({ id: 'b1', role: 'bot', reply })] });
    render(<ChatPanel chat={chat} />);
    fireEvent.click(screen.getByRole('button', { name: 'No, I still need help' }));
    expect(chat.resolve).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: "Yes, it's solved" }));
    expect(chat.resolve).toHaveBeenCalledWith(true);
  });
});
