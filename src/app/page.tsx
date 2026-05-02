import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome to KMITSURAT Work Portal</h1>
      <p className="text-muted mb-6">Select a menu from the sidebar or go to the dashboard.</p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
