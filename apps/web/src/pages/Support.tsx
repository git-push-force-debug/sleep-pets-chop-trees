import { ChatPanel } from '../chat/ChatPanel.tsx';
import { useChatContext } from '../chat/ChatLauncher.tsx';

export function Support() {
  const chat = useChatContext();
  return (
    <div className="wrap page-pad support-layout">
      <div className="support-intro stack-s">
        <p className="eyebrow">Help &amp; support</p>
        <h1>Ask Pip, or talk to the team</h1>
        <p className="lede">
          Pip answers from the official game guide. For purchases, bugs or lost pets, press <b>Talk to a person</b> — the team replies in this
          same chat, and your ticket number keeps track of it.
        </p>
        <ul className="support-points">
          <li>The team will never ask for your password or payment details.</li>
          <li>Keep this browser to come back to your chat later.</li>
          <li>A resolved ticket closes its chat — start a new one any time.</li>
        </ul>
      </div>
      <ChatPanel chat={chat} variant="page" />
    </div>
  );
}
