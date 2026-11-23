
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

const ZONA = "America/Puerto_Rico";

function fechaServicio(valor: string): string {
  if (!valor) return "";

  // Una fecha DATE pura no necesita conversión.
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor;
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";

  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const obtener = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  return `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
}

function fechaPuertoRico(): string {
  return fechaServicio(new Date().toISOString());
}

function fechaCalendario(valor: string): Date {
  return new Date(`${valor}T12:00:00`);
}

function claveFecha(fecha: Date): string {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function inicioSemana(fecha: Date): Date {
  const resultado = new Date(fecha);
  resultado.setDate(
    resultado.getDate() - ((resultado.getDay() + 6) % 7)
  );
  return resultado;
}

function formatearFecha(valor: string): string {
  const fecha = fechaServicio(valor);

  if (!fecha) return "Fecha no disponible";

  return fechaCalendario(fecha).toLocaleDateString(
    "es-PR",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

export default function EstadisticasPage() {
  const [supabase] = useState(() => createClient());

  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [fechaActual, setFechaActual] = useState("");

  useEffect(() => {
    setFechaActual(fechaPuertoRico());

    async function cargar() {
      setLoading(true);

      const { data, error: consultaError } = await supabase
        .from("ingresos")
        .select(
          "id, cliente_id, nombre_cliente, precio, servicio, fecha"
        )
        .order("fecha", { ascending: false });

      if (consultaError) {
        console.error(consultaError);
        setError("No se pudieron cargar los ingresos.");
      } else {
        setIngresos(data || []);
        setError("");
      }

      setLoading(false);
    }

    void cargar();
  }, [supabase]);

  async function cargarIngresos() {
    setLoading(true);

    const { data, error: consultaError } = await supabase
      .from("ingresos")
      .select(
        "id, cliente_id, nombre_cliente, precio, servicio, fecha"
      )
      .order("fecha", { ascending: false });

    if (consultaError) {
      console.error(consultaError);
      setError("No se pudieron cargar los ingresos.");
    } else {
      setIngresos(data || []);
      setError("");
    }

    setLoading(false);
  }

  const ingresosPeriodo = useMemo(() => {
    if (!fechaActual) return [];

    const hoy = fechaActual;
    const base = fechaCalendario(hoy);

    let inicio = hoy;

    if (periodo === "semana") {
      inicio = claveFecha(inicioSemana(base));
    }

    if (periodo === "mes") {
      inicio = `${hoy.slice(0, 7)}-01`;
    }

    if (periodo === "ano") {
      inicio = `${hoy.slice(0, 4)}-01-01`;
    }

    return ingresos.filter((ingreso) => {
      const fecha = fechaServicio(ingreso.fecha);

      return (
        fecha !== "" &&
        fecha >= inicio &&
        fecha <= hoy
      );
    });
  }, [ingresos, periodo, fechaActual]);

  const totalPeriodo = useMemo(
    () =>
      ingresosPeriodo.reduce(
        (total, ingreso) => total + Number(ingreso.precio),
        0
      ),
    [ingresosPeriodo]
  );

  const cantidadCortesPeriodo = ingresosPeriodo.length;

  const totalGeneral = useMemo(
    () =>
      ingresos.reduce(
        (total, ingreso) => total + Number(ingreso.precio),
        0
      ),
    [ingresos]
  );

  const clienteMasFrecuente = useMemo(() => {
    const conteo: Record<
      string,
      { nombre: string; visitas: number }
    > = {};

    ingresos.forEach((ingreso) => {
      const key =
        ingreso.cliente_id || ingreso.nombre_cliente;

      if (!conteo[key]) {
        conteo[key] = {
          nombre: ingreso.nombre_cliente,
          visitas: 0,
        };
      }

      conteo[key].visitas += 1;
    });

    return (
      Object.values(conteo).sort(
        (a, b) => b.visitas - a.visitas
      )[0] ?? null
    );
  }, [ingresos]);

  const clienteQueMasGenera = useMemo(() => {
    const totales: Record<
      string,
      { nombre: string; total: number }
    > = {};

    ingresos.forEach((ingreso) => {
      const key =
        ingreso.cliente_id || ingreso.nombre_cliente;

      if (!totales[key]) {
        totales[key] = {
          nombre: ingreso.nombre_cliente,
          total: 0,
        };
      }

      totales[key].total += Number(ingreso.precio);
    });

    return (
      Object.values(totales).sort(
        (a, b) => b.total - a.total
      )[0] ?? null
    );
  }, [ingresos]);

  const promedioPorCorte =
    cantidadCortesPeriodo > 0
      ? totalPeriodo / cantidadCortesPeriodo
      : 0;

  const datosGrafico = useMemo(() => {
    if (!fechaActual) return [];

    const ahora = fechaCalendario(fechaActual);

    const sumar = (desde: string, hasta: string) =>
      ingresosPeriodo
        .filter((ingreso) => {
          const fecha = fechaServicio(ingreso.fecha);
          return fecha >= desde && fecha <= hasta;
        })
        .reduce(
          (total, ingreso) =>
            total + Number(ingreso.precio),
          0
        );

    if (periodo === "dia") {
      return [
        {
          etiqueta: "Hoy",
          total: sumar(fechaActual, fechaActual),
        },
      ];
    }

    if (periodo === "semana") {
      const lunes = inicioSemana(ahora);

      return Array.from({ length: 7 }, (_, i) => {
        const dia = new Date(lunes);
        dia.setDate(lunes.getDate() + i);

        const fecha = claveFecha(dia);

        return {
          etiqueta: dia.toLocaleDateString("es-PR", {
            weekday: "short",
          }),
          total: sumar(fecha, fecha),
        };
      });
    }

    if (periodo === "mes") {
      const ano = ahora.getFullYear();
      const mes = ahora.getMonth();
      const ultimoDia = new Date(
        ano,
        mes + 1,
        0
      ).getDate();

      return Array.from(
        { length: Math.ceil(ultimoDia / 7) },
        (_, i) => {
          const inicio = claveFecha(
            new Date(ano, mes, i * 7 + 1)
          );

          const fin = claveFecha(
            new Date(
              ano,
              mes,
              Math.min((i + 1) * 7, ultimoDia)
            )
          );

          return {
            etiqueta: `Sem ${i + 1}`,
            total: sumar(inicio, fin),
          };
        }
      );
    }

    const ano = ahora.getFullYear();

    return Array.from({ length: 12 }, (_, i) => {
      const primero = new Date(ano, i, 1);
      const ultimo = new Date(ano, i + 1, 0);

      return {
        etiqueta: primero.toLocaleDateString("es-PR", {
          month: "short",
        }),
        total: sumar(
          claveFecha(primero),
          claveFecha(ultimo)
        ),
      };
    });
  }, [ingresosPeriodo, periodo, fechaActual]);

  async function eliminarIngreso(ingresoId: string) {
    const confirmar = window.confirm(
      "¿Estás seguro de que quieres eliminar este ingreso? Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    const ingreso = ingresos.find(
      (item) => item.id === ingresoId
    );

    if (!ingreso) return;

    const { error: eliminarError } = await supabase
      .from("ingresos")
      .delete()
      .eq("id", ingresoId);

    if (eliminarError) {
      console.error(eliminarError);
      alert("No se pudo eliminar el ingreso.");
      return;
    }

    if (ingreso.cliente_id) {
      const { data: ultimoIngreso, error: ultimoError } =
        await supabase
          .from("ingresos")
          .select("servicio, precio, fecha")
          .eq("cliente_id", ingreso.cliente_id)
          .order("fecha", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (ultimoError) {
        console.error(ultimoError);
        alert(
          "Se eliminó el ingreso, pero no se pudo comprobar la última visita del cliente."
        );
      } else if (ultimoIngreso) {
        const { error: actualizarError } = await supabase
          .from("clientes")
          .update({
            corte_actual: ultimoIngreso.servicio,
            precio: Number(ultimoIngreso.precio),
            ultima_visita: fechaServicio(
              ultimoIngreso.fecha
            ),
          })
          .eq("id", ingreso.cliente_id);

        if (actualizarError) {
          console.error(actualizarError);
        }
      } else {
        const { error: actualizarError } = await supabase
          .from("clientes")
          .update({
            corte_actual: null,
            precio: null,
            ultima_visita: null,
          })
          .eq("id", ingreso.cliente_id);

        if (actualizarError) {
          console.error(actualizarError);
        }
      }
    }

    await cargarIngresos();
  }

  const maxGrafico = Math.max(
    ...datosGrafico.map((dato) => dato.total),
    1
  );

  const nombrePeriodo: Record<Periodo, string> = {
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
              type="button"
              onClick={() => {
                setFechaActual(fechaPuertoRico());
                setPeriodo(valor);
              }}
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

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400"
          >
            {error}
          </div>
        )}

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
              {nombrePeriodo[periodo].toLowerCase()}
            </p>
          </div>

          <div className="flex h-64 items-end gap-2 overflow-x-auto">
            {datosGrafico.map((dato, index) => {
              const altura =
                dato.total === 0
                  ? 4
                  : Math.max(
                      (dato.total / maxGrafico) * 100,
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
            })}
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
              {cantidadCortesPeriodo === 1 ? "" : "s"} en{" "}
              {nombrePeriodo[periodo].toLowerCase()}
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-800 p-8 text-center text-zinc-500">
              Cargando estadísticas...
            </div>
          ) : ingresosPeriodo.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 p-10 text-center">
              <div className="text-5xl">📊</div>

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
              {ingresosPeriodo.map((ingreso) => (
                <div
                  key={ingreso.id}
                  className="rounded-2xl border border-zinc-800 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold">
                        {ingreso.nombre_cliente}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-400">
                        {ingreso.servicio}
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        {formatearFecha(ingreso.fecha)}
                      </p>
                    </div>

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

                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/estadisticas/ingreso/${ingreso.id}`}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                        >
                          ✏️ Editar
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            eliminarIngreso(ingreso.id)
                          }
                          className="rounded-lg border border-red-900 px-3 py-2 text-sm font-semibold text-red-400 transition hover:border-red-700 hover:bg-red-950/30"
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
