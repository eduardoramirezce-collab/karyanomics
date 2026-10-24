import { Suspense } from "react";
import LoginTabs from "./LoginTabs";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900">Sign in</h1>
        <p className="text-base text-slate-700">
          This is a demo. There are no real accounts or passwords, and nothing is stored on a server.
        </p>
      </header>
      <Suspense fallback={<p className="text-base text-slate-700">Loading sign-in…</p>}>
        <LoginTabs />
      </Suspense>
    </main>
  );
}
