export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="text-sm text-gray-600">Basic login page placeholder for MVP.</p>

      <form className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          className="rounded border px-3 py-2"
        />
        <button
          type="button"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
