
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Movimiento = {
  monto: number;
  fecha: string;
};

type Periodo = "hoy" | "semana" | "mes" | "anio" | "todo";

const periodos: { id: Periodo; nombre: string }[] = [
  { id: "hoy", nombre: "Hoy" },
  { id: "semana", nombre: "Semana" },
  { id: "mes", nombre: "Mes" },
  { id: "anio", nombre: "Año" },
  { id: "todo", nombre: "Todo" },
];

function fechaLocal(fecha: Date) {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function filtrarFecha(
  fechaMovimiento: string,
  periodo: Periodo,
  hoy: string
) {
  const fecha = fechaMovimiento.slice(0, 10);

  if (periodo === "todo") return true;
  if (periodo === "hoy") return fecha === hoy;
  if (periodo === "mes") {
    return fecha.slice(0, 7) === hoy.slice(0, 7);
  }
  if (periodo === "anio") {
    return fecha.slice(0, 4) === hoy.slice(0, 4);
  }

  const [anio, mes, dia] = hoy.split("-").map(Number);
  const inicio = new Date(anio, mes - 1, dia);
  const diaSemana = (inicio.getDay() + 6) % 7;

  inicio.setDate(inicio.getDate() - diaSemana);

  return fecha >= fechaLocal(inicio) && fecha <= hoy;
}

export default function FinanzasAsicalePage() {
  const [ingresos, setIngresos] = useState<Movimiento[]>([]);
  const [gastos, setGastos] = useState<Movimiento[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [hoy, setHoy] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setHoy(fechaLocal(new Date()));

    let activo = true;

    async function cargarDatos() {
      const supabase = createClient();

      const [respuestaIngresos, respuestaGastos] =
        await Promise.all([
          supabase
            .from("ingresos_asicale")
            .select("monto, fecha"),

          supabase
            .from("gastos")
            .select("monto, fecha")
            .eq("area", "asicale"),
        ]);

      if (!activo) return;

      if (respuestaIngresos.error || respuestaGastos.error) {
        setError(
          respuestaIngresos.error?.message ||
          respuestaGastos.error?.message ||
          "No se pudieron cargar los datos."
        );
      } else {
        setIngresos(
          (respuestaIngresos.data || []) as Movimiento[]
        );
        setGastos(
          (respuestaGastos.data || []) as Movimiento[]
        );
      }

      setCargando(false);
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  const resumen = useMemo(() => {
    if (!hoy) {
      return {
        ingresos: 0,
        gastos: 0,
        balance: 0,
        cantidadIngresos: 0,
        cantidadGastos: 0,
      };
    }

    const ingresosFiltrados = ingresos.filter((movimiento) =>
      filtrarFecha(movimiento.fecha, periodo, hoy)
    );

    const gastosFiltrados = gastos.filter((movimiento) =>
      filtrarFecha(movimiento.fecha, periodo, hoy)
    );

    const totalIngresos = ingresosFiltrados.reduce(
      (suma, movimiento) => suma + Number(movimiento.monto),
      0
    );

    const totalGastos = gastosFiltrados.reduce(
      (suma, movimiento) => suma + Number(movimiento.monto),
      0
    );

    return {
      ingresos: totalIngresos,
      gastos: totalGastos,
      balance: totalIngresos - totalGastos,
      cantidadIngresos: ingresosFiltrados.length,
      cantidadGastos: gastosFiltrados.length,
    };
  }, [ingresos, gastos, periodo, hoy]);

  const dinero = (cantidad: number) =>
    cantidad.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  const totalMovimientos = resumen.ingresos + resumen.gastos;
  const porcentajeIngresos =
    totalMovimientos > 0
      ? (resumen.ingresos / totalMovimientos) * 100
      : 0;

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/asicale"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a Asicale Club
        </Link>

        <header className="mt-8">
          <p className="text-sm text-zinc-500">
            ASICALE CLUB / FINANZAS
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            📈 Resumen financiero
          </h1>

          <p className="mt-3 text-zinc-400">
            Control de ingresos, gastos y balance de tu marca.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          {periodos.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => setPeriodo(opcion.id)}
              className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                periodo === opcion.id
                  ? "bg-white text-black"
                  : "border border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              {opcion.nombre}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-6 text-red-400">
            Error: {error}
          </p>
        )}

        {cargando || !hoy ? (
          <p className="mt-10 text-zinc-400">
            Cargando finanzas...
          </p>
        ) : !error && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Ingresos
                </p>
                <p className="mt-3 text-3xl font-bold text-green-400">
                  {dinero(resumen.ingresos)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {resumen.cantidadIngresos} ventas
                </p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Gastos
                </p>
                <p className="mt-3 text-3xl font-bold text-red-400">
                  {dinero(resumen.gastos)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {resumen.cantidadGastos} gastos
                </p>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-400">
                  Balance neto
                </p>
                <p className={`mt-3 text-3xl font-bold ${
                  resumen.balance >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}>
                  {dinero(resumen.balance)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Ingresos menos gastos
                </p>
              </div>
            </div>

            <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">
                Comparación financiera
              </h2>

              <div className="mt-6 flex h-5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="bg-green-500"
                  style={{ width: `${porcentajeIngresos}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{
                    width: `${100 - porcentajeIngresos}%`,
                  }}
                />
              </div>

              <div className="mt-4 flex justify-between gap-4 text-sm">
                <span className="text-green-400">
                  Ingresos: {dinero(resumen.ingresos)}
                </span>
                <span className="text-red-400">
                  Gastos: {dinero(resumen.gastos)}
                </span>
              </div>
            </section>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Link
                href="/dashboard/asicale/ingresos"
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-600"
              >
                <h3 className="text-xl font-bold">
                  💰 Ver ingresos
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Consultar todas las ventas.
                </p>
              </Link>

              <Link
                href="/dashboard/gastos/asicale"
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-600"
              >
                <h3 className="text-xl font-bold">
                  💸 Ver gastos
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Consultar los gastos de la marca.
                </p>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
