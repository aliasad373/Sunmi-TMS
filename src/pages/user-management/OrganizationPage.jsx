export default function OrganizationPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        User Management / <span className="text-sky-400">Organization</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Organization</h1>
        <p className="mt-1 text-sm text-slate-400">Coming soon</p>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
        <div className="relative">
          <div className="text-sm font-semibold text-slate-100">Coming soon</div>
          <div className="mt-1 text-sm text-slate-400">Organization management will be added here.</div>
        </div>
      </section>
    </div>
  );
}
