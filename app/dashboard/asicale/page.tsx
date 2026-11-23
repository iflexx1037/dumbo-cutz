
import Link from "next/link";

export default function AsicalePage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver al Dashboard
        </Link>

        <header className="mt-8">
          <p className="text-sm text-zinc-500">
            DUMBO CUTZ / ASICALE CLUB
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            👕 Asicale Club
          </h1>

          <p className="mt-3 text-zinc-400">
            Inventario, ventas y administración
            financiera de tu marca.
          </p>
        </header>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">

          {/* INVENTARIO */}
          <Link
            href="/dashboard/asicale/inventario"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
          >
            <div className="mb-5 text-4xl">📦</div>

            <h2 className="text-2xl font-bold">
              Inventario
            </h2>

            <p className="mt-3 text-zinc-400">
              Administra tus productos, tallas,
              variaciones y cantidades disponibles.
            </p>
          </Link>

          {/* NUEVA VENTA */}
          <Link
            href="/dashboard/asicale/ventas/nueva"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
          >
            <div className="mb-5 text-4xl">🛒</div>

            <h2 className="text-2xl font-bold">
              Nueva venta
            </h2>

            <p className="mt-3 text-zinc-400">
              Registra varios artículos en una sola
              venta y descuenta el inventario.
            </p>
          </Link>

          {/* INGRESOS */}
          <Link
            href="/dashboard/asicale/ingresos"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
          >
            <div className="mb-5 text-4xl">💰</div>

            <h2 className="text-2xl font-bold">
              Ingresos
            </h2>

            <p className="mt-3 text-zinc-400">
              Consulta los ingresos registrados
              de Asicale Club.
            </p>
          </Link>

          {/* GASTOS */}
          <Link
            href="/dashboard/gastos/asicale"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
          >
            <div className="mb-5 text-4xl">💸</div>

            <h2 className="text-2xl font-bold">
              Gastos
            </h2>

            <p className="mt-3 text-zinc-400">
              Consulta y administra los gastos
              de Asicale Club.
            </p>
          </Link>

          {/* RESUMEN FINANCIERO */}
          <Link
            href="/dashboard/asicale/finanzas"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600 sm:col-span-2"
          >
            <div className="mb-5 text-4xl">📈</div>

            <h2 className="text-2xl font-bold">
              Resumen financiero
            </h2>

            <p className="mt-3 text-zinc-400">
              Consulta las ventas, gastos y
              ganancias de Asicale Club.
            </p>
          </Link>

        </div>
      </div>
    </main>
  );
}
