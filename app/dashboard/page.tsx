import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <header className="mb-10">
          <p className="text-sm text-zinc-500">
            DUMBO CUTZ
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Dashboard
          </h1>

          <p className="mt-2 text-zinc-400">
            Bienvenido a tu sistema de barbería.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">

          {/* CLIENTES */}
          <Link
            href="/dashboard/clientes"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-left transition hover:border-zinc-600"
          >
            <div className="mb-5 text-4xl">
              👥
            </div>

            <h2 className="text-2xl font-bold">
              Ver Clientes
            </h2>

            <p className="mt-2 text-zinc-400">
              Consulta y administra la información de tus clientes.
            </p>
          </Link>

          {/* ESTADÍSTICAS */}
          <Link
            href="/dashboard/estadisticas"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-left transition hover:border-zinc-600"
          >
            <div className="mb-5 text-4xl">
              📊
            </div>

            <h2 className="text-2xl font-bold">
              Estadísticas
            </h2>

            <p className="mt-2 text-zinc-400">
              Revisa tus cortes e ingresos.
            </p>
          </Link>

        </div>
      </div>
    </main>
  );
}