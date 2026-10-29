
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Ingreso = {
  id: string;
  descripcion: string;
  categoria: string;
  monto: number;
  fecha: string;
};

type Periodo = "hoy" | "semana" | "mes" | "anio" | "todo";

const periodos: { valor: Periodo; texto: string }[] = [
  { valor: "hoy", texto: "Hoy" },
  { valor: "semana", texto: "Semana" },
  { valor: "mes", texto: "Mes" },
  { valor: "anio", texto: "Año" },
  { valor: "todo", texto: "Todo" },
];

function fechaLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EstadisticasAsicalePage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [hoy, setHoy] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setHoy(fechaLocal(new Date()));

    let activo = true;

    async function cargar() {
      const supabase = createClient();
      const { data, error: consultaError } = await supabase
        .from("ingresos_asicale")
        .select("id, descripcion, categoria, monto, fecha")
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
    return () => { activo = false; };
  }, []);

  const filtrados = useMemo(() => {
    if (!hoy) return [];

    const [anio, mes, dia] = hoy.split("-").map(Number);
    const inicioSemana = new Date(anio, mes - 1, dia);
    const diaSemana = (inicioSemana.getDay() + 6) % 7;
    inicioSemana.setDate(inicioSemana.getDate() - diaSemana);
    const lunes = fechaLocal(inicioSemana);

    return ingresos.filter((ingreso) => {
      const fecha = ingreso.fecha.slice(0, 10);

      if (periodo === "hoy") return fecha === hoy;
      if (periodo === "semana") return fecha >= lunes && fecha <= hoy;
      if (periodo === "mes") return fecha.slice(0, 7) === hoy.slice(0, 7);
      if (periodo === "anio") return fecha.slice(0, 4) === hoy.slice(0, 4);
      return true;
    });
  }, [ingresos, periodo, hoy]);

  const total = filtrados.reduce(
    (suma, ingreso) => suma + Number(ingreso.monto), 0
  );

  const categorias = useMemo(() => {
    const resultado: Record<string, number> = {};

    for (const ingreso of filtrados) {
      const nombre = ingreso.categoria || "Otros";
      resultado[nombre] =
        (resultado[nombre] || 0) + Number(ingreso.monto);
    }

    return Object.entries(resultado)
      .sort((a, b) => b[1] - a[1]);
  }, [filtrados]);

  const dinero = (valor: number) =>
    valor.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/asicale/ingresos"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a Ingresos
        </Link>

        <header className="mt-8">
          <p className="text-sm text-zinc-500">
            ASICALE CLUB / ESTADÍSTICAS
          </p>
          <h1 className="mt-3 text-4xl font-bold">
            📊 Estadísticas de ingresos
          </h1>
          <p className="mt-3 text-zinc-400">
            Analiza las ventas de tu marca.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          {periodos.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setPeriodo(opcion.valor)}
              className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                periodo === opcion.valor
                  ? "bg-white text-black"
                  : "border border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              {opcion.texto}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-6 text-red-400">
            Error: {error}
          </p>
        )}

        {cargando || !hoy ? (
          <p className="mt-8 text-zinc-400">Cargando...</p>
        ) : !error && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Total vendido
                </p>
                <p className="mt-3 text-3xl font-bold text-green-400">
                  {dinero(total)}
                </p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Ventas registradas
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {filtrados.length}
                </p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Promedio por venta
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {dinero(filtrados.length ? total / filtrados.length : 0)}
                </p>
              </div>
            </div>

            <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">
                Ventas por categoría
              </h2>

              {categorias.length === 0 ? (
                <p className="mt-6 text-zinc-400">
                  No hay ventas en este período.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
                  {categorias.map(([nombre, cantidad]) => {
                    const porcentaje = total > 0
                      ? (cantidad / total) * 100
                      : 0;

                    return (
                      <div key={nombre}>
                        <div className="mb-2 flex justify-between gap-3">
                          <span>{nombre}</span>
                          <span className="font-bold">
                            {dinero(cantidad)} · {porcentaje.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-green-400"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">
                Movimientos del período
              </h2>
              <div className="mt-6 space-y-3">
                {filtrados.map((ingreso) => (
                  <div
                    key={ingreso.id}
                    className="flex justify-between gap-4 rounded-xl border border-zinc-800 p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {ingreso.descripcion}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {ingreso.categoria} · {ingreso.fecha.slice(0, 10)}
                      </p>
                    </div>
                    <p className="font-bold text-green-400">
                      +{dinero(Number(ingreso.monto))}
                    </p>
                  </div>
                ))}
                {filtrados.length === 0 && (
                  <p className="text-zinc-400">
                    No hay movimientos.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
