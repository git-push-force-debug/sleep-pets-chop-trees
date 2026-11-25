import { useCallback, useEffect, useState } from 'react';
import { supabase } from './auth.ts';

export interface SessionRow {
  id: string;
  status: 'bot' | 'waiting_human' | 'human' | 'resolved';
  bot_paused: boolean;
  chatwoot_display_id: number | null;
  roblox_username: string | null;
  email: string | null;
  page_url: string | null;
  user_agent: string | null;
  handoff_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function adminApi<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: { authorization: `Bearer ${data.session?.access_token ?? ''}`, ...(init.body !== undefined && { 'content-type': 'application/json' }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `Request failed (${res.status})`);
  return body as T;
}

/** Live list of chats (agents read all sessions under RLS); refreshes on any session change. */
export function useSessions(limit = 200) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false }).limit(limit);
    setSessions((data ?? []) as SessionRow[]);
  }, [limit]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('admin-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, (p) => {
        if (p.eventType === 'UPDATE' && (p.new as SessionRow).status === 'waiting_human' && (p.old as Partial<SessionRow>).status !== 'waiting_human') notifyHandoff(p.new as SessionRow);
        void refresh();
      })
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [refresh]);

  return { sessions, refresh };
}

function notifyHandoff(s: SessionRow) {
  try {
    const audio = new AudioContext(); // short two-tone chime
    [880, 1175].forEach((hz, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = hz;
      gain.gain.value = 0.06;
      osc.connect(gain).connect(audio.destination);
      osc.start(audio.currentTime + i * 0.16);
      osc.stop(audio.currentTime + i * 0.16 + 0.14);
    });
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('A player needs a person', { body: `Ticket #${s.chatwoot_display_id ?? '…'} · ${s.roblox_username ?? 'player'}` });
    }
  } catch {
    // notifications are best-effort
  }
}
