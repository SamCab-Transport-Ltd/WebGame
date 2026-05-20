'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS, type TownDto, type BuildingType } from '@webgame/shared';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const BUILDABLE: BuildingType[] = ['FARM', 'WATER_PUMP', 'SCRAP_YARD', 'BARRACKS', 'WALL'];

export default function TownPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!t) router.replace('/login');
    else setToken(t);
  }, [router]);

  const qc = useQueryClient();

  const { data: town, isLoading } = useQuery<TownDto>({
    queryKey: ['town', token],
    enabled: Boolean(token),
    queryFn: () => apiFetch<TownDto>('/towns/me', { token: token ?? undefined }),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!token) return;
    const sock = getSocket(token);
    const handler = (next: TownDto) => qc.setQueryData(['town', token], next);
    sock.on(SOCKET_EVENTS.TOWN_UPDATED, handler);
    return () => {
      sock.off(SOCKET_EVENTS.TOWN_UPDATED, handler);
    };
  }, [token, qc]);

  const buildMutation = useMutation({
    mutationFn: (type: BuildingType) =>
      apiFetch('/buildings', {
        method: 'POST',
        body: JSON.stringify({ type }),
        token: token ?? undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['town'] }),
  });

  if (!token || isLoading || !town) {
    return <main className="min-h-screen flex items-center justify-center">Loading…</main>;
  }

  return (
    <main className="min-h-screen px-8 py-6 space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold">{town.name}</h1>
          <p className="text-bone/60 text-sm">
            Sector ({town.sectorX}, {town.sectorY}) · Pop {town.population} · Happiness {town.happiness}
          </p>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/town" className="text-rust">Town</Link>
          <Link href="/news" className="text-bone/70 hover:text-bone">News</Link>
        </nav>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-2">Resources</h2>
        <div className="grid grid-cols-4 gap-4">
          {town.resources.map((r) => (
            <div key={r.kind} className="border border-bone/20 rounded p-4 bg-black/30">
              <div className="text-xs uppercase text-bone/60">{r.kind}</div>
              <div className="text-2xl font-semibold">
                {r.amount}
                <span className="text-bone/40 text-sm"> / {r.cap}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Buildings</h2>
        <ul className="space-y-1 mb-4">
          {town.buildings.map((b) => (
            <li key={b.id} className="text-sm">
              {b.type} · L{b.level} · HP {b.hp}
              {b.constructionEndsAt ? (
                <span className="text-rust"> · building until {new Date(b.constructionEndsAt).toLocaleTimeString()}</span>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {BUILDABLE.map((t) => (
            <button
              key={t}
              onClick={() => buildMutation.mutate(t)}
              disabled={buildMutation.isPending}
              className="px-3 py-1 border border-bone/30 rounded hover:bg-bone/10 disabled:opacity-50"
            >
              + {t}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
