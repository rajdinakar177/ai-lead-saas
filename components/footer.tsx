export function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xs font-bold text-black">
              L
            </div>

            <span className="font-semibold text-white">
              LeadFlow<span className="text-blue-400">AI</span>
            </span>
          </div>

          <p className="mt-2 text-sm text-zinc-600">
            Turn more leads into booked jobs.
          </p>
        </div>

        <p className="text-sm text-zinc-600">
          © {new Date().getFullYear()} LeadFlow AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
