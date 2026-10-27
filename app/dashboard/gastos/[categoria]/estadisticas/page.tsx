
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
};

type Periodo = "hoy" | "semana" | "mes" | "anio" | "todo";

const areas = {
  asicale: { nombre: "Asicale Club", icono: "👕" },
  personales: { nombre: "Personales", icono: "👤" },
  barberia: { nombre: "Barbería", icono: "💈" },
};

type Area = keyof typeof areas;

const periodos: { id: Periodo; nombre: string }[] = [
  { id: "hoy", nombre: "Hoy" },
  { id: "semana", nombre: "Semana" },
  { id: "mes", nombre: "Mes" },
  { id: "anio", nombre: "Año" },
  { id: "todo", nombre: "Todo" },
];

function fechaLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function perteneceAlPeriodo(
  fechaGasto: string,
  periodo: Periodo,
  ahora: Date
) {
  if (periodo === "todo") return true;

  const hoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  );

  const fecha = fechaGasto.slice(0, 10);
  const fechaHoy = fechaLocal(hoy);

  if (periodo === "hoy") {
    return fecha === fechaHoy;
  }

  if (periodo === "semana") {
    const inicio = new Date(hoy);
    const diaSemana = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - diaSemana);

    return fecha >= fechaLocal(inicio) && fecha <= fechaHoy;
  }

  if (periodo === "mes") {
    return fecha.slice(0, 7) === fechaHoy.slice(0, 7);
  }

  if (periodo === "anio") {
    return fecha.slice(0, 4) === fechaHoy.slice(0, 4);
  }

  return true;
}

function EstadisticasContenido() {
  const params = useParams();
  const area = params.categoria as string;
  const areaValida = area in areas ? (area as Area) : null;

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [ahora, setAhora] = useState<Date | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setAhora(new Date());
  }, []);

  useEffect(() => {
    if (!areaValida) {
      setCargando(false);
      return;
    }

    let activo = true;

    async function cargar() {
      setCargando(true);
      setError("");

      const supabase = createClient();

      const { data, error: consultaError } = await supabase
        .from("gastos")
        .select("id, area, descripcion, categoria, monto, fecha")
        .eq("area", areaValida!)
        .order("fecha", { ascending: false });

      if (!activo) return;

      if (consultaError) {
        setError(consultaError.message);
        setGastos([]);
      } else {
        setGastos((data || []) as Gasto[]);
      }

      setCargando(false);
    }

    cargar();

    return () => {
      activo = false;
    };
  }, [areaValida]);

  const gastosFiltrados = useMemo(() => {
    if (!ahora) return [];

    return gastos.filter((gasto) =>
      perteneceAlPeriodo(gasto.fecha, periodo, ahora)
    );
  }, [gastos, periodo, ahora]);

  const total = gastosFiltrados.reduce(
    (suma, gasto) => suma + Number(gasto.monto),
    0
  );

  const cantidad = gastosFiltrados.length;

  const promedio = cantidad > 0 ? total / cantidad : 0;

  const categorias = useMemo(() => {
    const acumulado: Record<string, { total: number; cantidad: number }> = {};

    for (const gasto of gastosFiltrados) {
      const nombre = gasto.categoria || "Sin categoría";

      if (!acumulado[nombre]) {
        acumulado[nombre] = { total: 0, cantidad: 0 };
      }

      acumulado[nombre].total += Number(gasto.monto);
      acumulado[nombre].cantidad += 1;
    }

    return Object.entries(acumulado)
      .map(([nombre, datos]) => ({ nombre, ...datos }))
      .sort((a, b) => b.total - a.total);
  }, [gastosFiltrados]);

  const dinero = (valor: number) =>
    valor.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  if (!areaValida) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Categoría no encontrada.
      </main>
    );
  }

  const datos = areas[areaValida];

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <Link
          href={`/dashboard/gastos/${areaValida}`}
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a {datos.nombre}
        </Link>

        <header className="mt-8">
          <p className="text-sm text-zinc-500">
            DUMBO CUTZ / GASTOS
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {datos.icono} Estadísticas
          </h1>

          <p className="mt-3 text-zinc-400">
            Análisis de gastos de {datos.nombre}
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          {periodos.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => setPeriodo(opcion.id)}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                periodo === opcion.id
                  ? "bg-white text-black"
                  : "border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
              }`}
            >
              {opcion.nombre}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-6 text-red-400">
            Error al cargar gastos: {error}
          </p>
        )}

        {cargando || !ahora ? (
          <p className="mt-10 text-zinc-400">
            Cargando estadísticas...
          </p>
        ) : !error && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Total gastado
                </p>
                <p className="mt-3 text-3xl font-bold text-red-400">
                  {dinero(total)}
                </p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Cantidad de gastos
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {cantidad}
                </p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Promedio por gasto
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {dinero(promedio)}
                </p>
              </div>
            </div>

            <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">
                Gastos por categoría
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Distribución del dinero gastado
              </p>

              {categorias.length === 0 ? (
                <p className="mt-8 text-center text-zinc-400">
                  No hay gastos en este período.
                </p>
              ) : (
                <div className="mt-8 space-y-6">
                  {categorias.map((categoria) => {
                    const porcentaje =
                      total > 0
                        ? (categoria.total / total) * 100
                        : 0;

                    return (
                      <div key={categoria.nombre}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {categoria.nombre}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {categoria.cantidad} gastos
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold">
                              {dinero(categoria.total)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {porcentaje.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-white"
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

              {gastosFiltrados.length === 0 ? (
                <p className="mt-6 text-zinc-400">
                  No hay movimientos.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {gastosFiltrados.map((gasto) => (
                    <div
                      key={gasto.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {gasto.descripcion}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {gasto.categoria} · {gasto.fecha.slice(0, 10)}
                        </p>
                      </div>

                      <p className="font-bold text-red-400">
                        -{dinero(Number(gasto.monto))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function EstadisticasGastosPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black p-10 text-white">
          Cargando estadísticas...
        </main>
      }
    >
      <EstadisticasContenido />
    </Suspense>
  );
}
