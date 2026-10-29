
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Ingreso = {
  id: string;
  descripcion: string;
  categoria: string;
  monto: number;
  fecha: string;
  notas: string | null;
};

export default function IngresosAsicalePage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const supabase = createClient();

      const { data, error: consultaError } = await supabase
        .from("ingresos_asicale")
        .select("*")
        .order("fecha", { ascending: false });

      if (!activo) return;

      if (consultaError) {
        setError(consultaError.message);
      } else {
        setIngresos((data || []) as Ingreso[]);
      }

      setCargando(false);
    }

    cargar();

    return () => {
      activo = false;
    };
  }, []);

  async function eliminarIngreso(id: string) {
    if (
      !window.confirm(
        "¿Seguro que quieres eliminar esta venta? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    setEliminando(id);
    setError("");

    const supabase = createClient();

    const { data, error: eliminarError } = await supabase
      .from("ingresos_asicale")
      .delete()
      .eq("id", id)
      .select("id");

    if (eliminarError || !data?.length) {
      setError(
        eliminarError?.message || "No se pudo eliminar el ingreso."
      );
    } else {
      setIngresos((actuales) =>
        actuales.filter((ingreso) => ingreso.id !== id)
      );
    }

    setEliminando(null);
  }

  const total = ingresos.reduce(
    (suma, ingreso) => suma + Number(ingreso.monto),
    0
  );

  const dinero = (cantidad: number) =>
    cantidad.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/asicale"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a Asicale Club
        </Link>

        <header className="mt-8 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm text-zinc-500">
              ASICALE CLUB / INGRESOS
            </p>
            <h1 className="mt-3 text-4xl font-bold">
              💰 Ingresos
            </h1>
            <p className="mt-3 text-zinc-400">
              Ventas y movimientos de tu marca.
            </p>
          </div>


<Link
  href="/dashboard/asicale/ingresos/estadisticas"
  className="rounded-xl border border-zinc-700 px-6 py-3 text-center font-semibold text-white hover:bg-zinc-800"
>
  📊 Estadísticas
</Link>

          <Link
            href="/dashboard/asicale/ingresos/nuevo"
            className="rounded-xl bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200"
          >
            + Nuevo ingreso
          </Link>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">
              Total de ingresos
            </p>
            <p className="mt-3 text-4xl font-bold text-green-400">
              {cargando ? "..." : dinero(total)}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">
              Ventas registradas
            </p>
            <p className="mt-3 text-4xl font-bold">
              {cargando ? "..." : ingresos.length}
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-bold">
            Historial de ingresos
          </h2>

          {error && (
            <p role="alert" className="mt-5 text-red-400">
              {error}
            </p>
          )}

          {cargando ? (
            <p className="mt-8 text-zinc-400">
              Cargando ingresos...
            </p>
          ) : ingresos.length === 0 ? (
            <p className="mt-8 text-zinc-400">
              Todavía no hay ingresos registrados.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {ingresos.map((ingreso) => (
                <div
                  key={ingreso.id}
                  className="rounded-2xl border border-zinc-800 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {ingreso.descripcion}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-400">
                        {ingreso.categoria}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {ingreso.fecha}
                      </p>

                      {ingreso.notas && (
                        <p className="mt-2 text-sm text-zinc-400">
                          {ingreso.notas}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">
                        +{dinero(Number(ingreso.monto))}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/dashboard/asicale/ingresos/editar/${ingreso.id}`}
                          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                        >
                          ✏️ Editar
                        </Link>

                        <button
                          type="button"
                          disabled={eliminando !== null}
                          onClick={() => eliminarIngreso(ingreso.id)}
                          className="rounded-xl border border-red-900 px-4 py-2 text-sm text-red-400 disabled:opacity-50"
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
        </section>
      </div>
    </main>
  );
}
