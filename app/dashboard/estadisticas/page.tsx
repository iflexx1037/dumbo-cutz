"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Ingreso = {
  id: string;
  cliente_id: string | null;
  nombre_cliente: string;
  precio: number;
  servicio: string;
  fecha: string;
};

type Periodo = "dia" | "semana" | "mes" | "ano";

export default function EstadisticasPage() {
  const supabase = createClient();

  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [fechaActual, setFechaActual] = useState<string | null>(null);

  useEffect(() => {
    setFechaActual(new Date().toISOString());
    cargarIngresos();
  }, []);

  async function cargarIngresos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("ingresos")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error cargando ingresos:", error);
      setLoading(false);
      return;
    }

    setIngresos(data || []);
    setLoading(false);
  }

  function obtenerInicioPeriodo(
    tipo: Periodo,
    fechaBase: Date
  ) {
    const ahora = new Date(fechaBase);

    if (tipo === "dia") {
      const inicio = new Date(ahora);
      inicio.setHours(0, 0, 0, 0);
      return inicio;
    }

    if (tipo === "semana") {
      const inicio = new Date(ahora);
      const dia = inicio.getDay();

      const diferencia = dia === 0 ? 6 : dia - 1;

      inicio.setDate(inicio.getDate() - diferencia);
      inicio.setHours(0, 0, 0, 0);

      return inicio;
    }

    if (tipo === "mes") {
      return new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        1
      );
    }

    return new Date(
      ahora.getFullYear(),
      0,
      1
    );
  }

  const ingresosPeriodo = useMemo(() => {
    if (!fechaActual) {
      return [];
    }

    const inicio = obtenerInicioPeriodo(
      periodo,
      new Date(fechaActual)
    );

    return ingresos.filter((ingreso) => {
      return new Date(ingreso.fecha) >= inicio;
    });
  }, [ingresos, periodo, fechaActual]);

  const totalPeriodo = useMemo(() => {
    return ingresosPeriodo.reduce(
      (total, ingreso) =>
        total + Number(ingreso.precio),
      0
    );
  }, [ingresosPeriodo]);

  const cantidadCortesPeriodo =
    ingresosPeriodo.length;

  const totalGeneral = useMemo(() => {
    return ingresos.reduce(
      (total, ingreso) =>
        total + Number(ingreso.precio),
      0
    );
  }, [ingresos]);

  const clienteMasFrecuente = useMemo(() => {
    if (ingresos.length === 0) {
      return null;
    }

    const conteo: Record<
      string,
      {
        nombre: string;
        visitas: number;
      }
    > = {};

    ingresos.forEach((ingreso) => {
      const key =
        ingreso.cliente_id ||
        ingreso.nombre_cliente;

      if (!conteo[key]) {
        conteo[key] = {
          nombre: ingreso.nombre_cliente,
          visitas: 0,
        };
      }

      conteo[key].visitas += 1;
    });

    return Object.values(conteo).sort(
      (a, b) => b.visitas - a.visitas
    )[0];
  }, [ingresos]);

  const clienteQueMasGenera = useMemo(() => {
    if (ingresos.length === 0) {
      return null;
    }

    const totales: Record<
      string,
      {
        nombre: string;
        total: number;
      }
    > = {};

    ingresos.forEach((ingreso) => {
      const key =
        ingreso.cliente_id ||
        ingreso.nombre_cliente;

      if (!totales[key]) {
        totales[key] = {
          nombre: ingreso.nombre_cliente,
          total: 0,
        };
      }

      totales[key].total += Number(
        ingreso.precio
      );
    });

    return Object.values(totales).sort(
      (a, b) => b.total - a.total
    )[0];
  }, [ingresos]);

  const promedioPorCorte =
    ingresosPeriodo.length > 0
      ? totalPeriodo / ingresosPeriodo.length
      : 0;

  const datosGrafico = useMemo(() => {
    if (!fechaActual) {
      return [];
    }

    const ahora = new Date(fechaActual);

    const datos: {
      etiqueta: string;
      total: number;
    }[] = [];

    if (periodo === "dia") {
      for (let hora = 8; hora <= 20; hora++) {
        const total = ingresosPeriodo
          .filter((ingreso) => {
            const fecha = new Date(ingreso.fecha);

            return fecha.getHours() === hora;
          })
          .reduce(
            (sum, ingreso) =>
              sum + Number(ingreso.precio),
            0
          );

        datos.push({
          etiqueta: `${hora}:00`,
          total,
        });
      }
    }

    if (periodo === "semana") {
      for (let i = 0; i < 7; i++) {
        const fecha = new Date(ahora);

        const diaActual = fecha.getDay();

        const diferencia =
          diaActual === 0
            ? 6
            : diaActual - 1;

        fecha.setDate(
          fecha.getDate() -
            diferencia +
            i
        );

        fecha.setHours(0, 0, 0, 0);

        const siguiente = new Date(fecha);

        siguiente.setDate(
          siguiente.getDate() + 1
        );

        const total = ingresosPeriodo
          .filter((ingreso) => {
            const fechaIngreso =
              new Date(ingreso.fecha);

            return (
              fechaIngreso >= fecha &&
              fechaIngreso < siguiente
            );
          })
          .reduce(
            (sum, ingreso) =>
              sum + Number(ingreso.precio),
            0
          );

        datos.push({
          etiqueta: fecha.toLocaleDateString(
            "es-PR",
            {
              weekday: "short",
            }
          ),
          total,
        });
      }
    }

    if (periodo === "mes") {
      for (let i = 0; i < 5; i++) {
        const inicio = new Date(
          ahora.getFullYear(),
          ahora.getMonth(),
          i * 7 + 1
        );

        const siguiente = new Date(
          ahora.getFullYear(),
          ahora.getMonth(),
          i * 7 + 8
        );

        const total = ingresosPeriodo
          .filter((ingreso) => {
            const fecha =
              new Date(ingreso.fecha);

            return (
              fecha >= inicio &&
              fecha < siguiente
            );
          })
          .reduce(
            (sum, ingreso) =>
              sum + Number(ingreso.precio),
            0
          );

        datos.push({
          etiqueta: `Sem ${i + 1}`,
          total,
        });
      }
    }

    if (periodo === "ano") {
      for (let i = 0; i < 12; i++) {
        const inicio = new Date(
          ahora.getFullYear(),
          i,
          1
        );

        const siguiente = new Date(
          ahora.getFullYear(),
          i + 1,
          1
        );

        const total = ingresosPeriodo
          .filter((ingreso) => {
            const fecha =
              new Date(ingreso.fecha);

            return (
              fecha >= inicio &&
              fecha < siguiente
            );
          })
          .reduce(
            (sum, ingreso) =>
              sum + Number(ingreso.precio),
            0
          );

        datos.push({
          etiqueta:
            inicio.toLocaleDateString(
              "es-PR",
              {
                month: "short",
              }
            ),
          total,
        });
      }
    }

    return datos;
  }, [
    ingresosPeriodo,
    periodo,
    fechaActual,
  ]);

  async function eliminarIngreso(ingresoId: string) {
  const confirmar = window.confirm(
    "¿Estás seguro de que quieres eliminar este ingreso? Esta acción no se puede deshacer."
  );

  if (!confirmar) {
    return;
  }

  const ingreso = ingresos.find(
    (item) => item.id === ingresoId
  );

  if (!ingreso) {
    return;
  }

  const { error } = await supabase
    .from("ingresos")
    .delete()
    .eq("id", ingresoId);

  if (error) {
    console.error(error);
    alert("No se pudo eliminar el ingreso.");
    return;
  }

  // Si el ingreso pertenecía a un cliente,
  // buscamos cuál es ahora su último corte.
  if (ingreso.cliente_id) {
    const { data: ultimoIngreso, error: ultimoError } =
      await supabase
        .from("ingresos")
        .select("servicio, precio, fecha")
        .eq(
          "cliente_id",
          ingreso.cliente_id
        )
        .order("fecha", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (ultimoError) {
      console.error(ultimoError);
    }

    if (ultimoIngreso) {
      const nuevaUltimaVisita =
        new Date(
          ultimoIngreso.fecha
        )
          .toISOString()
          .split("T")[0];

      await supabase
        .from("clientes")
        .update({
          corte_actual:
            ultimoIngreso.servicio,
          precio:
            Number(ultimoIngreso.precio),
          ultima_visita:
            nuevaUltimaVisita,
        })
        .eq(
          "id",
          ingreso.cliente_id
        );
    } else {
      // Ya no quedan ingresos para ese cliente.
      await supabase
        .from("clientes")
        .update({
          corte_actual: null,
          precio: null,
          ultima_visita: null,
        })
        .eq(
          "id",
          ingreso.cliente_id
        );
    }
  }

  // Recargar estadísticas
  cargarIngresos();
}

  const maxGrafico = Math.max(
    ...datosGrafico.map(
      (dato) => dato.total
    ),
    1
  );

  function formatearFecha(fecha: string) {
    return new Date(
      fecha
    ).toLocaleDateString("es-PR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatearHora(fecha: string) {
    return new Date(
      fecha
    ).toLocaleTimeString("es-PR", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const nombrePeriodo = {
    dia: "Hoy",
    semana: "Esta semana",
    mes: "Este mes",
    ano: "Este año",
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8">

          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white"
          >
            ← Dashboard
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm text-zinc-500">
                DUMBO CUTZ
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Estadísticas
              </h1>

              <p className="mt-2 text-zinc-400">
                Tu rendimiento de barbería.
              </p>
            </div>

            <Link
              href="/dashboard/estadisticas/nuevo-ingreso"
              className="rounded-xl bg-white px-5 py-3 text-center font-bold text-black transition hover:bg-zinc-200"
            >
              + Crear ingreso
            </Link>

          </div>
        </div>

        {/* PERIODOS */}
        <div className="mb-6 flex flex-wrap gap-2">

          {(
            [
              ["dia", "Hoy"],
              ["semana", "Semana"],
              ["mes", "Mes"],
              ["ano", "Año"],
            ] as [Periodo, string][]
          ).map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() =>
                setPeriodo(valor)
              }
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                periodo === valor
                  ? "bg-white text-black"
                  : "border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
              }`}
            >
              {texto}
            </button>
          ))}

        </div>

        {/* ESTADÍSTICAS PRINCIPALES */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">
              💰 Ingresos
            </p>

            <p className="mt-3 text-3xl font-bold">
              ${totalPeriodo.toFixed(2)}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              {nombrePeriodo[periodo]}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">
              ✂️ Cortes
            </p>

            <p className="mt-3 text-3xl font-bold">
              {cantidadCortesPeriodo}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              {nombrePeriodo[periodo]}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">
              💵 Promedio por corte
            </p>

            <p className="mt-3 text-3xl font-bold">
              ${promedioPorCorte.toFixed(2)}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              En el periodo seleccionado
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">
              💎 Ingresos totales
            </p>

            <p className="mt-3 text-3xl font-bold">
              ${totalGeneral.toFixed(2)}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              Desde que comenzaste a registrar
            </p>
          </div>

        </div>

        {/* CLIENTES DESTACADOS */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

            <p className="text-sm text-zinc-500">
              🏆 Cliente más frecuente
            </p>

            {clienteMasFrecuente ? (
              <>
                <h2 className="mt-3 text-2xl font-bold">
                  {clienteMasFrecuente.nombre}
                </h2>

                <p className="mt-2 text-zinc-400">
                  {clienteMasFrecuente.visitas} visita
                  {clienteMasFrecuente.visitas === 1
                    ? ""
                    : "s"}
                </p>
              </>
            ) : (
              <p className="mt-3 text-zinc-600">
                Todavía no hay datos.
              </p>
            )}

          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

            <p className="text-sm text-zinc-500">
              💰 Cliente que más genera
            </p>

            {clienteQueMasGenera ? (
              <>
                <h2 className="mt-3 text-2xl font-bold">
                  {clienteQueMasGenera.nombre}
                </h2>

                <p className="mt-2 text-zinc-400">
                  ${clienteQueMasGenera.total.toFixed(2)} generados
                </p>
              </>
            ) : (
              <p className="mt-3 text-zinc-600">
                Todavía no hay datos.
              </p>
            )}

          </div>

        </div>

        {/* GRÁFICO */}
        <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

          <div className="mb-8">
            <h2 className="text-xl font-bold">
              Ingresos
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Rendimiento de{" "}
              {nombrePeriodo[
                periodo
              ].toLowerCase()}
            </p>
          </div>

          <div className="flex h-64 items-end gap-2 overflow-x-auto">

            {datosGrafico.map(
              (dato, index) => {
                const altura =
                  dato.total === 0
                    ? 4
                    : Math.max(
                        (dato.total /
                          maxGrafico) *
                          100,
                        8
                      );

                return (
                  <div
                    key={`${dato.etiqueta}-${index}`}
                    className="flex min-w-[40px] flex-1 flex-col items-center justify-end gap-2"
                  >

                    <span className="text-xs text-zinc-500">
                      {dato.total > 0
                        ? `$${dato.total.toFixed(0)}`
                        : ""}
                    </span>

                    <div
                      className="w-full max-w-[45px] rounded-t-lg bg-white transition-all"
                      style={{
                        height: `${altura}%`,
                      }}
                    />

                    <span className="text-xs text-zinc-600">
                      {dato.etiqueta}
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* HISTORIAL */}
        <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

          <div className="mb-6">

            <h2 className="text-xl font-bold">
              Clientes atendidos
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {cantidadCortesPeriodo} servicio
              {cantidadCortesPeriodo === 1
                ? ""
                : "s"} en{" "}
              {nombrePeriodo[
                periodo
              ].toLowerCase()}
            </p>

          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-800 p-8 text-center text-zinc-500">
              Cargando estadísticas...
            </div>
          ) : ingresosPeriodo.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 p-10 text-center">

              <div className="text-5xl">
                📊
              </div>

              <h3 className="mt-4 text-lg font-bold">
                No hay ingresos en este periodo
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Registra un corte para comenzar a ver tus estadísticas.
              </p>

              <Link
                href="/dashboard/estadisticas/nuevo-ingreso"
                className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-bold text-black"
              >
                + Crear ingreso
              </Link>

            </div>
          ) : (
            <div className="space-y-3">

              {ingresosPeriodo.map(
  (ingreso) => (
    <div
      key={ingreso.id}
      className="rounded-2xl border border-zinc-800 p-5"
    >

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        {/* INFORMACIÓN DEL INGRESO */}

        <div>
          <h3 className="font-bold">
            {ingreso.nombre_cliente}
          </h3>

          <p className="mt-1 text-sm text-zinc-400">
            {ingreso.servicio}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            {formatearFecha(
              ingreso.fecha
            )}{" "}
            ·{" "}
            {formatearHora(
              ingreso.fecha
            )}
          </p>
        </div>

        {/* PRECIO + BOTONES */}

        <div className="flex flex-col gap-3 sm:items-end">

          <div className="text-left sm:text-right">

            <p className="text-xl font-bold">
              $
              {Number(
                ingreso.precio
              ).toFixed(2)}
            </p>

            <p className="text-xs text-zinc-500">
              Pagado
            </p>

          </div>

          {/* BOTONES */}

          <div className="flex gap-2">

            <Link
              href={`/dashboard/estadisticas/ingreso/${ingreso.id}`}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              ✏️ Editar
            </Link>

<button
  type="button"
  onClick={() => eliminarIngreso(ingreso.id)}
  className="rounded-lg border border-red-900 px-3 py-2 text-sm font-semibold text-red-400 transition hover:border-red-700 hover:bg-red-950/30"
>
  🗑️ Eliminar
</button>

          </div>

        </div>

      </div>

    </div>
  )
)}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}