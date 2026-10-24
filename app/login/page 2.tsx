import { Suspense } from "react";
import LoginAside from "./LoginAside";
import LoginTabs from "./LoginTabs";

export default function LoginPage() {
  return (
    <main className="grid w-full flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <LoginAside />
      <div className="flex w-full flex-col gap-6 px-5 py-10 sm:px-8 lg:px-14 lg:py-16">
        <header className="flex max-w-2xl flex-col gap-2">
          <h1 className="display text-5xl text-ink sm:text-6xl">Sign in</h1>
          <p className="text-base text-ink/80">
            This is a demo. There are no real accounts or passwords, and nothing is stored on a server.
          </p>
        </header>
        <div className="w-full max-w-2xl">
          <Suspense fallback={<p className="text-base text-ink/80">Loading sign-in…</p>}>
            <LoginTabs />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
