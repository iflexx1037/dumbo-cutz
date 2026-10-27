
import Link from "next/link";

const categorias = {
  asicale: {
    nombre: "Asicale Club",
    icono: "👕",
    descripcion: "Gastos de Asicale Club",
  },
  personales: {
    nombre: "Personales",
    icono: "👤",
    descripcion: "Tus gastos personales",
  },
  barberia: {
    nombre: "Barbería",
    icono: "💈",
    descripcion: "Gastos de Dumbo Cutz",
  },
};

type Categoria = keyof typeof categorias;

export async function generateStaticParams() {
  return [
    { categoria: "asicale" },
    { categoria: "personales" },
    { categoria: "barberia" },
  ];
}

export default async function CategoriaGastosPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;

  if (!(categoria in categorias)) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        <h1 className="text-3xl font-bold">
          Categoría no encontrada
        </h1>

        <Link
          href="/dashboard/gastos"
          className="mt-5 inline-block text-zinc-400"
        >
          ← Volver a Gastos
        </Link>
      </main>
    );
  }

  const datos = categorias[categoria as Categoria];

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/gastos"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Volver a Gastos
        </Link>

        
<div className="mt-8 flex justify-end">
  <Link
    href={`/dashboard/gastos/${categoria}/nuevo`}
    className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
  >
    + Nuevo gasto
  </Link>
</div>


        <header className="mt-8">
          <p className="text-sm text-zinc-500">
            DUMBO CUTZ / GASTOS
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {datos.icono} {datos.nombre}
          </h1>

          <p className="mt-3 text-zinc-400">
            {datos.descripcion}
          </p>
        </header>

        <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <h2 className="text-2xl font-bold">
            Control de gastos
          </h2>

          <p className="mt-3 text-zinc-400">
            Aquí podrás registrar, consultar,
            editar y eliminar tus gastos.
          </p>

          <div className="mt-8 rounded-2xl border border-zinc-800 p-8 text-center">
            <div className="text-4xl">💸</div>

            <p className="mt-4 text-zinc-400">
              Todavía no hay gastos registrados.
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Próximamente conectaremos esta
              sección con Supabase.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
