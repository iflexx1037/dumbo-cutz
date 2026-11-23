"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Detalle = {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  asicale_variantes: {
    talla: string | null;
    variacion: string | null;
    asicale_productos: { nombre: string } | null;
  } | null;
};

type Venta = {
  id: string;
  fecha: string;
  creado_en: string;
  estado: "completada" | "anulada";
  metodo_pago: string | null;
  notas: string | null;
  subtotal: number | null;
  descuento: number | null;
  total: number;
  asicale_venta_detalles: Detalle[];
};

const dinero = (valor: number) =>
  Number(valor).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export default function HistorialVentasAsicale() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: consultaError } = await supabase
        .from("asicale_ventas")
        .select(`
          id, fecha, creado_en, estado, metodo_pago, notas,
          subtotal, descuento, total,
          asicale_venta_detalles (
            id, cantidad, precio_unitario, subtotal,
            asicale_variantes (
              talla, variacion,
              asicale_productos (nombre)
            )
          )
        `)
        .order("creado_en", { ascending: false });

      if (consultaError) throw consultaError;


      // Normalizar los datos de Supabase correctamente.
      const normalizadas: Venta[] = (data ?? []).map((venta) => ({
        id: String(venta.id),
        fecha: String(venta.fecha),
        creado_en: String(venta.creado_en),
        estado: venta.estado === "anulada" ? "anulada" : "completada",
        metodo_pago: venta.metodo_pago ?? null,
        notas: venta.notas ?? null,
        subtotal: venta.subtotal == null ? null : Number(venta.subtotal),
        descuento: venta.descuento == null ? null : Number(venta.descuento),
        total: Number(venta.total),

        asicale_venta_detalles: (venta.asicale_venta_detalles ?? []).map(
          (detalle) => {
            // Supabase puede devolver relaciones como arreglos.
            const varianteRaw = detalle.asicale_variantes;

            const variante = Array.isArray(varianteRaw)
              ? varianteRaw[0]
              : varianteRaw;

            const productoRaw = variante?.asicale_productos;

            const producto = Array.isArray(productoRaw)
              ? productoRaw[0]
              : productoRaw;

            return {
              id: String(detalle.id),
              cantidad: Number(detalle.cantidad),
              precio_unitario: Number(detalle.precio_unitario),
              subtotal: Number(detalle.subtotal),

              asicale_variantes: variante
                ? {
                    talla: variante.talla ?? null,
                    variacion: variante.variacion ?? null,
                    asicale_productos: producto
                      ? {
                          nombre: String(producto.nombre),
                        }
                      : null,
                  }
                : null,
            };
          }
        ),
      }));

      setVentas(normalizadas);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el historial."
      );
    } finally {
      setCargando(false);
    }
  }, []);


  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return ventas.filter((venta) => {
      if (filtro !== "todas" && venta.estado !== filtro) return false;
      const contenido = [
        venta.id,
        venta.fecha,
        venta.metodo_pago ?? "",
        venta.notas ?? "",
        ...venta.asicale_venta_detalles.map((detalle) =>
          [
            detalle.asicale_variantes?.asicale_productos?.nombre ?? "",
            detalle.asicale_variantes?.talla ?? "",
            detalle.asicale_variantes?.variacion ?? "",
          ].join(" ")
        ),
      ].join(" ").toLowerCase();
      return contenido.includes(termino);
    });
  }, [ventas, filtro, busqueda]);

  const totalCobrado = visibles
    .filter((venta) => venta.estado === "completada")
    .reduce((suma, venta) => suma + venta.total, 0);

  async function anular(venta: Venta) {
    if (venta.estado !== "completada" || procesando) return;

    const confirmado = window.confirm(
      `¿Anular esta venta de ${dinero(venta.total)}? Se devolverán los artículos al inventario y se retirará el ingreso asociado. Esta acción no se puede deshacer desde esta pantalla.`
    );
    if (!confirmado) return;

    setProcesando(venta.id);
    setError("");
    setMensaje("");

    try {
      const supabase = createClient();
      const { error: anularError } = await supabase.rpc("asicale_anular_venta", {
        p_venta_id: venta.id,
      });
      if (anularError) throw anularError;
      await cargar();
      setMensaje("La solicitud de anulación se completó. Comprueba el inventario y el ingreso asociado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo anular la venta.");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/asicale" className="text-sm text-zinc-400 hover:text-white">
          ← Volver a Asicale Club
        </Link>

        <header className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">ASICALE CLUB / VENTAS</p>
            <h1 className="mt-2 text-3xl font-bold">Historial de ventas</h1>
            <p className="mt-2 text-zinc-400">Consulta ventas, descuentos y anulaciones.</p>
          </div>
          <Link href="/dashboard/asicale/ventas/nueva" className="rounded-xl bg-white px-5 py-3 font-semibold text-black">
            + Nueva venta
          </Link>
        </header>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">Ventas mostradas</p>
            <p className="mt-2 text-3xl font-bold">{visibles.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">Total cobrado (no anuladas)</p>
            <p className="mt-2 text-3xl font-bold text-green-400">{dinero(totalCobrado)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_190px]">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto, fecha o método de pago..."
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 outline-none"
          />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
          >
            <option value="todas">Todas</option>
            <option value="completada">Completadas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-900 p-4 text-red-400">
            {error}
          </p>
        )}
        {mensaje && <p role="status" className="mt-5 text-green-400">{mensaje}</p>}

        {cargando ? (
          <p className="mt-8 text-zinc-400">Cargando ventas...</p>
        ) : visibles.length === 0 ? (
          <p className="mt-8 text-zinc-400">No hay ventas para mostrar.</p>
        ) : (
          <div className="mt-6 space-y-5">
            {visibles.map((venta) => {
              const subtotal = venta.subtotal ?? venta.total;
              const descuento = venta.descuento ?? 0;
              return (
                <article key={venta.id} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">Venta del {venta.fecha}</p>
                      <p className="mt-1 text-xs text-zinc-500">ID: {venta.id.slice(0, 8)}</p>
                      <p className="mt-1 text-sm text-zinc-400">{venta.metodo_pago || "Método no indicado"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${venta.estado === "anulada" ? "bg-red-950 text-red-300" : "bg-green-950 text-green-300"}`}>
                      {venta.estado === "anulada" ? "Anulada" : "Completada"}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-zinc-800 pt-4">
                    {venta.asicale_venta_detalles.length === 0 && (
                      <p className="text-sm text-zinc-500">Sin detalles disponibles.</p>
                    )}
                    {venta.asicale_venta_detalles.map((detalle) => (
                      <div key={detalle.id} className="flex justify-between gap-4 text-sm">
                        <div>
                          <p className="font-semibold">{detalle.asicale_variantes?.asicale_productos?.nombre || "Producto"}</p>
                          <p className="text-zinc-400">
                            {[detalle.asicale_variantes?.talla, detalle.asicale_variantes?.variacion].filter(Boolean).join(" · ") || "Única"}
                          </p>
                          <p className="text-zinc-500">{detalle.cantidad} × {dinero(detalle.precio_unitario)}</p>
                        </div>
                        <p className="font-semibold">{dinero(detalle.subtotal)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2 border-t border-zinc-800 pt-4 text-sm">
                    <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{dinero(subtotal)}</span></div>
                    <div className="flex justify-between text-red-400"><span>Descuento</span><span>−{dinero(descuento)}</span></div>
                    <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{dinero(venta.total)}</span></div>
                  </div>

                  {venta.notas && (
                    <p className="mt-4 rounded-xl bg-black p-3 text-sm text-zinc-400">Notas: {venta.notas}</p>
                  )}

                  {venta.estado === "completada" && (
                    <button
                      type="button"
                      disabled={Boolean(procesando)}
                      onClick={() => void anular(venta)}
                      className="mt-5 rounded-xl border border-red-900 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                    >
                      {procesando === venta.id ? "Anulando..." : "Anular venta y devolver inventario"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
