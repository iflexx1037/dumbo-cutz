
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Gasto = {
  id: string;
  area: string;
  descripcion: string;
  categoria: string;
  monto: number;
  fecha: string;
  notas: string | null;
};

const areas = {
  asicale: {
    nombre: "Asicale Club",
    icono: "👕",
  },
  personales: {
    nombre: "Personales",
    icono: "👤",
  },
  barberia: {
    nombre: "Barbería",
    icono: "💈",
  },
};

type Area = keyof typeof areas;

function GastosContenido() {
  const params = useParams();
  const area = params.categoria as string;

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const areaValida = area in areas
    ? (area as Area)
    : null;

  useEffect(() => {
    if (!areaValida) {
      setLoading(false);
      return;
    }

    let activo = true;

    async function cargarGastos() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const { data, error: errorSupabase } =
        await supabase
          .from("gastos")
          .select("*")
          .eq("area", areaValida!)
          .order("fecha", { ascending: false });

      if (!activo) return;

      if (errorSupabase) {
        console.error(errorSupabase);
        setError(errorSupabase.message);
        setGastos([]);
      } else {
        setGastos((data || []) as Gasto[]);
      }

      setLoading(false);
    }

    cargarGastos();

    return () => {
      activo = false;
    };
  }, [areaValida]);

  if (!areaValida) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        <h1 className="text-2xl font-bold">
          Categoría no encontrada
        </h1>
        <Link href="/dashboard/gastos">
          ← Volver a Gastos
        </Link>
      </main>
    );
  }

  const datos = areas[areaValida];

  const total = gastos.reduce(
    (suma, gasto) => suma + Number(gasto.monto),
    0
  );


async function eliminarGasto(gastoId: string) {
  const confirmar = window.confirm(
    "¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer."
  );

  if (!confirmar) return;

  const supabase = createClient();

  const { error: errorSupabase } = await supabase
    .from("gastos")
    .delete()
    .eq("id", gastoId)
    .eq("area", areaValida!);

  if (errorSupabase) {
    alert("No se pudo eliminar: " + errorSupabase.message);
    return;
  }

  setGastos((actuales) =>
    actuales.filter((gasto) => gasto.id !== gastoId)
  );
}


  const dinero = (cantidad: number) =>
    cantidad.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  function mostrarFecha(fecha: string) {
    const partes = fecha.slice(0, 10).split("-");
    if (partes.length !== 3) return fecha;

    const [anio, mes, dia] = partes.map(Number);

    return new Date(anio, mes - 1, dia)
      .toLocaleDateString("es-PR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/dashboard/gastos"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Volver a Gastos
        </Link>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              DUMBO CUTZ / GASTOS
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              {datos.icono} {datos.nombre}
            </h1>

            <p className="mt-2 text-zinc-400">
              Control de gastos
            </p>
          </div>

          <Link
            href={`/dashboard/gastos/${areaValida}/nuevo`}
            className="rounded-xl bg-white px-6 py-3 text-center font-semibold text-black transition hover:bg-zinc-200"
          >
            + Nuevo gasto
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">
              Total gastado
            </p>

            <p className="mt-3 text-4xl font-bold">
              {loading ? "..." : dinero(total)}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Todos los gastos registrados
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">
              Gastos registrados
            </p>

            <p className="mt-3 text-4xl font-bold">
              {loading ? "..." : gastos.length}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Movimientos de esta categoría
            </p>
          </div>

        </div>

        <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

          <h2 className="text-2xl font-bold">
            Historial de gastos
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Todos los gastos de {datos.nombre}
          </p>

          {loading ? (
            <p className="mt-8 text-center text-zinc-400">
              Cargando gastos...
            </p>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-900 p-6 text-red-400">
              Error al cargar los gastos: {error}
            </div>
          ) : gastos.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 p-10 text-center">
              <div className="text-4xl">💸</div>
              <p className="mt-3 text-zinc-400">
                Todavía no hay gastos registrados.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {gastos.map((gasto) => (
                <div
                  key={gasto.id}
                  className="rounded-2xl border border-zinc-800 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <h3 className="text-lg font-bold">
                        {gasto.descripcion}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-400">
                        {gasto.categoria}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {mostrarFecha(gasto.fecha)}
                      </p>

                      {gasto.notas && (
                        <p className="mt-2 text-sm text-zinc-400">
                          {gasto.notas}
                        </p>
                      )}
                    </div>

          
<div className="sm:text-right">
  <p className="text-2xl font-bold text-red-400">
    -{dinero(Number(gasto.monto))}
  </p>

  <div className="mt-3 flex gap-2 sm:justify-end">
    <Link
      href={`/dashboard/gastos/${areaValida}/editar/${gasto.id}`}
      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-800"
    >
      ✏️ Editar
    </Link>

    <button
      type="button"
      onClick={() => eliminarGasto(gasto.id)}
      className="rounded-xl border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950"
    >
      🗑️ Eliminar
    </button>
  </div>
</div>


                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CategoriaGastosPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black p-10 text-white">
          Cargando gastos...
        </main>
      }
    >
      <GastosContenido />
    </Suspense>
  );
}
