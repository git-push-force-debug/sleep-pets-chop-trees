import { createClient } from '@supabase/supabase-js';
import { errorMessage } from './chatReducer.ts';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'spct-player' },
});

/** Every visitor gets an anonymous Supabase identity; it persists in this browser so the chat survives reloads. */
export async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.access_token;
  const { data: signedIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signedIn.session) throw new ApiError(0, "We couldn't start the chat. Please refresh the page.");
  return signedIn.session.access_token;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: { authorization: `Bearer ${await accessToken()}`, ...(init.body !== undefined && { 'content-type': 'application/json' }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, errorMessage(0, null));
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(res.status, body));
  return body as T;
}
