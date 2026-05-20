import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4 text-rust">WebGame</h1>
      <p className="max-w-xl text-bone/80 mb-8">
        Rebuild your settlement from the ashes of a broken world. Manage civilians, gather scrap,
        defend against raiders, and survive whatever the wasteland sends next.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-2 bg-rust text-bone rounded hover:bg-rust/80 transition"
        >
          Log In
        </Link>
        <Link
          href="/register"
          className="px-6 py-2 border border-bone/40 rounded hover:bg-bone/10 transition"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
