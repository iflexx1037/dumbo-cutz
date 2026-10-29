
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


<Link
  href="/dashboard/citas"
  className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
>
  <div className="mb-5 text-4xl">
    📅
  </div>

  <h2 className="text-2xl font-bold">
    Citas
  </h2>

  <p className="mt-3 text-zinc-400">
    Organiza tus citas, clientes y pagos desde el calendario.
  </p>
</Link>


<Link
  href="/dashboard/asicale"
  className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
>
  <div className="mb-5 text-4xl">
    👕
  </div>

  <h2 className="text-2xl font-bold">
    Asicale Club
  </h2>

  <p className="mt-3 text-zinc-400">
    Control de ingresos y gastos de tu marca.
  </p>
</Link>

          <Link
            href="/dashboard/clientes"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
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

          <Link
            href="/dashboard/estadisticas"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
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

          <Link
            href="/dashboard/gastos"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
          >
            <div className="mb-5 text-4xl">
              💸
            </div>

            <h2 className="text-2xl font-bold">
              Gastos
            </h2>

            <p className="mt-2 text-zinc-400">
              Administra los gastos de Asicale Club,
              personales y barbería.
            </p>
          </Link>

        </div>
      </div>
    </main>
  );
}
