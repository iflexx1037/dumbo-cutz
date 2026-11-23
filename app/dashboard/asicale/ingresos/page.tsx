"use client";

import { useCallback, useEffect, useState } from "react";
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

type VentaVinculada = {
  id: string;
  ingreso_id: string | null;
  estado: "completada" | "anulada";
};

const dinero = (cantidad: number) =>
  Number(cantidad).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export default function IngresosAsicalePage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [ventasPorIngreso, setVentasPorIngreso] = useState<
    Record<string, VentaVinculada>
  >({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const supabase = createClient();
      const [respuestaIngresos, respuestaVentas] = await Promise.all([
        supabase
          .from("ingresos_asicale")
          .select("id, descripcion, categoria, monto, fecha, notas")
          .order("fecha", { ascending: false }),
        supabase
          .from("asicale_ventas")
          .select("id, ingreso_id, estado")
          .not("ingreso_id", "is", null),
      ]);

      if (respuestaIngresos.error) throw respuestaIngresos.error;
      if (respuestaVentas.error) throw respuestaVentas.error;

      setIngresos((respuestaIngresos.data ?? []) as Ingreso[]);

      const vinculadas: Record<string, VentaVinculada> = {};
      for (const venta of (respuestaVentas.data ?? []) as VentaVinculada[]) {
        if (venta.ingreso_id) vinculadas[venta.ingreso_id] = venta;
      }
      setVentasPorIngreso(vinculadas);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los ingresos."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function eliminarIngreso(id: string) {
    if (eliminando) return;

    // Segunda verificación: impedir la eliminación de ingresos vinculados.
    setEliminando(id);
    setError("");

    try {
      const supabase = createClient();
      const { data: venta, error: errorVerificacion } = await supabase
        .from("asicale_ventas")
        .select("id, ingreso_id, estado")
        .eq("ingreso_id", id)
        .maybeSingle();

      if (errorVerificacion) throw errorVerificacion;

      if (venta) {
        setVentasPorIngreso((actuales) => ({
          ...actuales,
          [id]: venta as VentaVinculada,
        }));
        setError(
          "Este ingreso pertenece a una venta de inventario. Para cancelarla, entra a Historial de ventas."
        );
        return;
      }

      if (
        !window.confirm(
          "¿Seguro que quieres eliminar este ingreso manual? Esta acción no se puede deshacer."
        )
      ) {
        return;
      }

      const { data, error: eliminarError } = await supabase
        .from("ingresos_asicale")
        .delete()
        .eq("id", id)
        .select("id");

      if (eliminarError) throw eliminarError;
      if (!data?.length) {
        throw new Error(
          "No se eliminó el ingreso. Comprueba los permisos de Supabase."
        );
      }

      setIngresos((actuales) =>
        actuales.filter((ingreso) => ingreso.id !== id)
      );
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo eliminar.";
      setError(
        mensaje.includes("asicale_ventas_ingreso_id_fkey")
          ? "Este ingreso está vinculado a una venta. Anúlala desde Historial de ventas."
          : mensaje
      );
    } finally {
      setEliminando(null);
    }
  }

  const total = ingresos.reduce(
    (suma, ingreso) => suma + Number(ingreso.monto),
    0
  );

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
            <p className="text-sm text-zinc-500">ASICALE CLUB / INGRESOS</p>
            <h1 className="mt-3 text-4xl font-bold">💰 Ingresos</h1>
            <p className="mt-3 text-zinc-400">
              Ventas y movimientos de tu marca.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total de ingresos</p>
            <p className="mt-3 text-4xl font-bold text-green-400">
              {cargando ? "..." : dinero(total)}
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Ingresos registrados</p>
            <p className="mt-3 text-4xl font-bold">
              {cargando ? "..." : ingresos.length}
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Historial de ingresos</h2>
            <Link
              href="/dashboard/asicale/ventas/historial"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Ver historial de ventas
            </Link>
          </div>

          {error && (
            <p role="alert" className="mt-5 text-red-400">
              {error}
            </p>
          )}

          {cargando ? (
            <p className="mt-8 text-zinc-400">Cargando ingresos...</p>
          ) : ingresos.length === 0 ? (
            <p className="mt-8 text-zinc-400">
              Todavía no hay ingresos registrados.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {ingresos.map((ingreso) => {
                const venta = ventasPorIngreso[ingreso.id];

                return (
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
                        {venta && (
                          <p className="mt-2 text-xs text-zinc-500">
                            Venta de inventario · Administrar desde Historial de ventas
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">
                          +{dinero(Number(ingreso.monto))}
                        </p>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          {venta ? (
                            <Link
                              href="/dashboard/asicale/ventas/historial"
                              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                            >
                              Ver venta
                            </Link>
                          ) : (
                            <>
                              <Link
                                href={`/dashboard/asicale/ingresos/editar/${ingreso.id}`}
                                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                              >
                                ✏️ Editar
                              </Link>
                              <button
                                type="button"
                                disabled={eliminando !== null}
                                onClick={() => void eliminarIngreso(ingreso.id)}
                                className="rounded-xl border border-red-900 px-4 py-2 text-sm text-red-400 disabled:opacity-50"
                              >
                                {eliminando === ingreso.id
                                  ? "Eliminando..."
                                  : "🗑️ Eliminar"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
