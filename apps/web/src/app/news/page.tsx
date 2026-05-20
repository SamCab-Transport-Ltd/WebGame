'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SOCKET_EVENTS, type WorldEventDto } from '@webgame/shared';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function NewsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<WorldEventDto[]>([]);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!t) {
      router.replace('/login');
      return;
    }
    setToken(t);
    apiFetch<WorldEventDto[]>('/world-events?limit=25', { token: t })
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const sock = getSocket(token);
    const handler = (evt: WorldEventDto) => {
      setEvents((prev) => [evt, ...prev].slice(0, 50));
    };
    sock.on(SOCKET_EVENTS.WORLD_EVENT_CREATED, handler);
    return () => {
      sock.off(SOCKET_EVENTS.WORLD_EVENT_CREATED, handler);
    };
  }, [token]);

  if (!token) return <main className="min-h-screen flex items-center justify-center">Loading…</main>;

  return (
    <main className="min-h-screen px-8 py-6 space-y-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold">World News</h1>
        <p className="text-bone/60 text-sm">Live feed. Powered by world-event detectors.</p>
      </header>
      <ul className="space-y-3">
        {events.length === 0 ? <li className="text-bone/50">No news yet. The wasteland is quiet.</li> : null}
        {events.map((e) => (
          <li key={e.id} className="border border-bone/20 rounded p-4 bg-black/30">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs uppercase text-rust">{e.kind}</span>
              <span className="text-xs text-bone/50">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
            <h2 className="font-semibold mb-1">{e.headline}</h2>
            <p className="text-sm text-bone/80">{e.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
