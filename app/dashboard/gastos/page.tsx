
import Link from "next/link";

const secciones = [
  {
    nombre: "Asicale Club",
    descripcion:
      "Producción, inventario, envíos, publicidad y eventos.",
    icono: "👕",
    ruta: "/dashboard/gastos/asicale",
  },
  {
    nombre: "Personales",
    descripcion:
      "Gasolina, comida, compras y gastos personales.",
    icono: "👤",
    ruta: "/dashboard/gastos/personales",
  },
  {
    nombre: "Barbería",
    descripcion:
      "Herramientas, productos, mantenimiento y educación.",
    icono: "💈",
    ruta: "/dashboard/gastos/barberia",
  },
];

export default function GastosPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Volver al Dashboard
        </Link>

        <header className="mb-10 mt-8">
          <p className="text-sm text-zinc-500">
            DUMBO CUTZ
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Gastos
          </h1>

          <p className="mt-2 text-zinc-400">
            Administra tus gastos por separado.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {secciones.map((seccion) => (
            <Link
              key={seccion.ruta}
              href={seccion.ruta}
              className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600"
            >
              <div className="mb-5 text-4xl">
                {seccion.icono}
              </div>

              <h2 className="text-2xl font-bold">
                {seccion.nombre}
              </h2>

              <p className="mt-2 text-zinc-400">
                {seccion.descripcion}
              </p>

              <p className="mt-6 text-sm font-semibold text-white">
                Ver gastos →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
