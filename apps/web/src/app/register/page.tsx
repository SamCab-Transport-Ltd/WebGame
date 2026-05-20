'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthTokens, UserDto } from '@webgame/shared';
import { apiFetch } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<AuthTokens & { user: UserDto }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      router.push('/town');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border border-bone/20 rounded-lg p-8 bg-black/30"
      >
        <h1 className="text-2xl font-semibold mb-2">Register</h1>
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
          className="w-full bg-black/40 border border-bone/20 rounded px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-black/40 border border-bone/20 rounded px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full bg-black/40 border border-bone/20 rounded px-3 py-2"
        />
        {error ? <p className="text-rust text-sm">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rust text-bone py-2 rounded hover:bg-rust/80 disabled:opacity-50"
        >
          {loading ? '…' : 'Create Settlement'}
        </button>
      </form>
    </main>
  );
}
