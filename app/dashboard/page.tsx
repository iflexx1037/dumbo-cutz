
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nombre: string;
  frecuencia: string | null;
  ultima_visita: string | null;
};

type Aviso = {
  id: string;
  nombre: string;
  fecha: string;
  dias: number;
  visto: boolean;
};

const supabase = createClient();

function fechaLocal(fecha: Date) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function hoyPuertoRico() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const obtener = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  return `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
}

function fechaUTC(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function diferenciaDias(desde: string, hasta: string) {
  return Math.round(
    (fechaUTC(hasta).getTime() - fechaUTC(desde).getTime()) /
      86400000
  );
}

function sumarDias(fecha: string, dias: number) {
  const d = fechaUTC(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function sumarMeses(fecha: string, meses: number) {
  const d = fechaUTC(fecha);
  const diaOriginal = d.getUTCDate();

  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);

  const ultimoDia = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();

  d.setUTCDate(Math.min(diaOriginal, ultimoDia));
  return d.toISOString().slice(0, 10);
}

function interpretarFrecuencia(texto: string) {
  const valor = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const numeroTexto: Record<string, number> = {
    una: 1,
    un: 1,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
  };

  const coincidencia = valor.match(
    /(\d+|una|un|uno|dos|tres|cuatro)\s*(dias?|semanas?|meses?)/
  );

  if (coincidencia) {
    const cantidad =
      Number(coincidencia[1]) ||
      numeroTexto[coincidencia[1]];

    const unidad = coincidencia[2];

    if (!cantidad || cantidad < 1) return null;

    if (unidad.startsWith("dia")) {
      return { tipo: "dias", cantidad };
    }

    if (unidad.startsWith("semana")) {
      return { tipo: "dias", cantidad: cantidad * 7 };
    }

    return { tipo: "meses", cantidad };
  }

  if (valor.includes("quincenal")) {
    return { tipo: "dias", cantidad: 14 };
  }

  if (valor.includes("semanal")) {
    return { tipo: "dias", cantidad: 7 };
  }

  if (valor.includes("mensual")) {
    return { tipo: "meses", cantidad: 1 };
  }

  return null;
}

function proximaFecha(
  ultimaVisita: string,
  frecuencia: string
) {
  const regla = interpretarFrecuencia(frecuencia);
  if (!regla) return null;

  if (regla.tipo === "dias") {
    return sumarDias(ultimaVisita, regla.cantidad);
  }

  return sumarMeses(ultimaVisita, regla.cantidad);
}

function etiquetaDias(dias: number) {
  if (dias < 0) {
    return `Hace ${Math.abs(dias)} día(s)`;
  }
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

export default function DashboardPage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarNotificaciones = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("No se pudo verificar la sesión.");
      }

      const { data: clientes, error: clientesError } =
        await supabase
          .from("clientes")
          .select("id, nombre, frecuencia, ultima_visita")
          .eq("eliminado", false);

      if (clientesError) throw clientesError;

      const { data: vistos, error: vistosError } =
        await supabase
          .from("notificaciones_recortes_vistas")
          .select("cliente_id, fecha_recorte")
          .eq("usuario_id", user.id);

      if (vistosError) throw vistosError;

      const vistosSet = new Set(
        (vistos ?? []).map(
          (v) => `${v.cliente_id}|${v.fecha_recorte}`
        )
      );

      const hoy = hoyPuertoRico();
      const nuevosAvisos: Aviso[] = [];

      for (const cliente of (clientes ?? []) as Cliente[]) {
        if (!cliente.ultima_visita || !cliente.frecuencia) {
          continue;
        }

        const fecha = proximaFecha(
          cliente.ultima_visita,
          cliente.frecuencia
        );

        if (!fecha) continue;

        const dias = diferenciaDias(hoy, fecha);

        // Próximos 3 días y hasta 7 días de atraso.
        if (dias < -7 || dias > 3) continue;

        nuevosAvisos.push({
          id: cliente.id,
          nombre: cliente.nombre,
          fecha,
          dias,
          visto: vistosSet.has(`${cliente.id}|${fecha}`),
        });
      }

      nuevosAvisos.sort((a, b) => a.dias - b.dias);
      setAvisos(nuevosAvisos);
    } catch (err) {
      console.error("Error en notificaciones:", err);
      setError("No se pudieron cargar los recordatorios.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarNotificaciones();
  }, [cargarNotificaciones]);

  const pendientes = avisos.filter((a) => !a.visto).length;

  async function abrirNotificaciones() {
    const abrir = !abierto;
    setAbierto(abrir);

    if (!abrir || pendientes === 0) return;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sesión no disponible.");
      }

      const pendientesActuales = avisos.filter(
        (aviso) => !aviso.visto
      );

      const registros = pendientesActuales.map((aviso) => ({
        usuario_id: user.id,
        cliente_id: aviso.id,
        fecha_recorte: aviso.fecha,
      }));

      const { error: guardarError } = await supabase
        .from("notificaciones_recortes_vistas")
        .upsert(registros, {
          onConflict: "usuario_id,cliente_id,fecha_recorte",
          ignoreDuplicates: true,
        });

      if (guardarError) throw guardarError;

      setAvisos((anteriores) =>
        anteriores.map((aviso) =>
          pendientesActuales.some(
            (p) => p.id === aviso.id && p.fecha === aviso.fecha
          )
            ? { ...aviso, visto: true }
            : aviso
        )
      );
    } catch (err) {
      console.error("Error marcando notificaciones:", err);
      setError("No se pudieron marcar como vistas.");
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <header className="mb-10">
          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="text-sm text-zinc-500">
                DUMBO CUTZ
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Dashboard
              </h1>

              <p className="mt-2 text-zinc-400">
                Bienvenido a tu sistema de barbería.
              </p>
            </div>

            <button
              type="button"
              onClick={abrirNotificaciones}
              aria-label="Ver notificaciones"
              aria-expanded={abierto}
              className="relative rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-2xl transition hover:border-zinc-500"
            >
              🔔

              {pendientes > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                  {pendientes}
                </span>
              )}
            </button>

          </div>

          {abierto && (
            <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    💈 Próximos recortes
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Recordatorios de tus clientes
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  aria-label="Cerrar notificaciones"
                >
                  ✕
                </button>
              </div>

              {cargando ? (
                <p className="text-zinc-400">
                  Cargando recordatorios...
                </p>
              ) : avisos.length === 0 ? (
                <p className="rounded-xl bg-zinc-900 p-5 text-sm text-zinc-400">
                  No tienes recortes próximos por ahora.
                </p>
              ) : (
                <div className="space-y-3">
                  {avisos.map((aviso) => (
                    <Link
                      key={`${aviso.id}-${aviso.fecha}`}
                      href={`/dashboard/clientes/${aviso.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-600"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {aviso.nombre}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Próximo recorte: {aviso.fecha}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          aviso.dias < 0
                            ? "bg-red-950 text-red-400"
                            : aviso.dias === 0
                            ? "bg-amber-950 text-amber-400"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {etiquetaDias(aviso.dias)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => void cargarNotificaciones()}
                className="mt-5 text-sm font-medium text-zinc-400 hover:text-white"
              >
                ↻ Actualizar recordatorios
              </button>
            </section>
          )}

          {!abierto && error && (
            <p className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">

          <Link
            href="/dashboard/citas"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600 sm:p-8"
          >
            <div className="mb-5 text-4xl">📅</div>
            <h2 className="text-2xl font-bold">Citas</h2>
            <p className="mt-3 text-zinc-400">
              Organiza tus citas, clientes y pagos desde el calendario.
            </p>
          </Link>

          <Link
            href="/dashboard/clientes"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600 sm:p-8"
          >
            <div className="mb-5 text-4xl">👥</div>
            <h2 className="text-2xl font-bold">Ver Clientes</h2>
            <p className="mt-2 text-zinc-400">
              Consulta y administra la información de tus clientes.
            </p>
          </Link>

          <Link
            href="/dashboard/estadisticas"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600 sm:p-8"
          >
            <div className="mb-5 text-4xl">📊</div>
            <h2 className="text-2xl font-bold">Estadísticas</h2>
            <p className="mt-2 text-zinc-400">
              Revisa tus cortes e ingresos.
            </p>
          </Link>

          <Link
            href="/dashboard/gastos"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600 sm:p-8"
          >
            <div className="mb-5 text-4xl">💸</div>
            <h2 className="text-2xl font-bold">Gastos</h2>
            <p className="mt-2 text-zinc-400">
              Administra los gastos de Asicale Club,
              personales y barbería.
            </p>
          </Link>

          <Link
            href="/dashboard/asicale"
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 transition hover:border-zinc-600 sm:col-span-2"
          >
            <div className="mb-5 text-4xl">👕</div>
            <h2 className="text-2xl font-bold">Asicale Club</h2>
            <p className="mt-3 text-zinc-400">
              Control de ingresos y gastos de tu marca.
            </p>
          </Link>

        </div>
      </div>
    </main>
  );
}
