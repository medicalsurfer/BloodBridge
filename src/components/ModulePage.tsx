type ModulePageProps = {
  label: string;
  title: string;
  description: string;
};

export default function ModulePage({
  label,
  title,
  description,
}: ModulePageProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
            {label}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {description}
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex min-h-55 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <div>
              <p className="text-sm font-medium text-slate-500">Module content</p>
              <p className="mt-2 text-lg font-semibold text-slate-700">{title}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
