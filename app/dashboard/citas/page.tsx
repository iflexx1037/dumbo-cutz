
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Cita = {
  id: string;
  fecha: string;
  hora: string;
  servicio: string;
  precio: number;
  estado: string;
  clientes: { nombre: string } | null;
};

type Vista = "mes" | "semana" | "dia";

const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function fechaISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function desdeISO(valor: string) {
  const [y, m, d] = valor.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function moverFecha(valor: string, dias: number) {
  const d = desdeISO(valor);
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
}

function inicioSemana(valor: string) {
  const d = desdeISO(valor);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fechaISO(d);
}

function horaBonita(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  const periodo = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${periodo}`;
}

export default function CitasPage() {
  const [fecha, setFecha] = useState("");
  const [vista, setVista] = useState<Vista>("semana");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const parametro = new URLSearchParams(
      window.location.search
    ).get("fecha");

    const fechaInicial =
      parametro && /^\d{4}-\d{2}-\d{2}$/.test(parametro)
        ? parametro
        : fechaISO(new Date());

    setFecha(fechaInicial);
  }, []);

  const rango = useMemo(() => {
    if (!fecha) return null;

    if (vista === "dia") {
      return { inicio: fecha, fin: fecha };
    }

    if (vista === "semana") {
      const inicio = inicioSemana(fecha);
      return {
        inicio,
        fin: moverFecha(inicio, 6),
      };
    }

    const d = desdeISO(fecha);
    const inicio = fechaISO(
      new Date(d.getFullYear(), d.getMonth(), 1)
    );
    const fin = fechaISO(
      new Date(d.getFullYear(), d.getMonth() + 1, 0)
    );

    return { inicio, fin };
  }, [fecha, vista]);

  useEffect(() => {
    if (!rango) return;

    let activo = true;

    async function cargar() {
      setCargando(true);
      setError("");

      const supabase = createClient();

      const { data, error: consultaError } = await supabase
        .from("citas")
        .select(`
          id, fecha, hora, servicio, precio, estado,
          clientes (nombre)
        `)
        .gte("fecha", rango!.inicio)
        .lte("fecha", rango!.fin)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });

      if (!activo) return;

      if (consultaError) {
        setError(consultaError.message);
        setCitas([]);
      } else {
        setCitas((data || []) as unknown as Cita[]);
      }

      setCargando(false);
    }

    cargar();

    return () => {
      activo = false;
    };
  }, [rango]);

  async function accion(
    id: string,
    tipo: "pagar_cita" | "cancelar_cita"
  ) {
    const mensaje =
      tipo === "pagar_cita"
        ? "¿Confirmas que recibiste el pago?"
        : "¿Cancelar esta cita sin registrar ningún ingreso?";

    if (!window.confirm(mensaje)) return;

    setProcesando(id);
    setError("");

    const supabase = createClient();

    const { error: accionError } = await supabase.rpc(
      tipo,
      { p_cita_id: id }
    );

    if (accionError) {
      setError(accionError.message);
    } else if (tipo === "cancelar_cita") {
      setCitas((actuales) =>
        actuales.filter((c) => c.id !== id)
      );
    } else {
      setCitas((actuales) =>
        actuales.map((c) =>
          c.id === id ? { ...c, estado: "pagada" } : c
        )
      );
    }

    setProcesando(null);
  }

  function navegar(direccion: number) {
    if (!fecha) return;

    if (vista === "dia") {
      setFecha(moverFecha(fecha, direccion));
    } else if (vista === "semana") {
      setFecha(moverFecha(fecha, direccion * 7));
    } else {
      const d = desdeISO(fecha);
      const destino = new Date(
        d.getFullYear(),
        d.getMonth() + direccion,
        1
      );
      setFecha(fechaISO(destino));
    }
  }

  const diasCalendario = useMemo(() => {
    if (!fecha || !rango) return [];

    if (vista === "dia") return [fecha];

    if (vista === "semana") {
      return Array.from({ length: 7 }, (_, i) =>
        moverFecha(rango.inicio, i)
      );
    }

    const inicio = inicioSemana(rango.inicio);
    const fin = inicioSemana(rango.fin);
    const ultimo = moverFecha(fin, 6);

    const resultado: string[] = [];
    let actual = inicio;

    while (actual <= ultimo && resultado.length < 42) {
      resultado.push(actual);
      actual = moverFecha(actual, 1);
    }

    return resultado;
  }, [fecha, vista, rango]);

  const titulo = fecha
    ? desdeISO(fecha).toLocaleDateString("es-PR", {
        month: "long",
        year: "numeric",
      })
    : "Calendario";

  const citasPorFecha = useMemo(() => {
    const resultado: Record<string, Cita[]> = {};

    for (const cita of citas) {
      if (!resultado[cita.fecha]) resultado[cita.fecha] = [];
      resultado[cita.fecha].push(cita);
    }

    return resultado;
  }, [citas]);

  function tarjetaCita(cita: Cita) {
    return (
      <div
        key={cita.id}
        className={`rounded-xl border p-3 ${
          cita.estado === "pagada"
            ? "border-green-900 bg-green-950/30"
            : "border-zinc-700 bg-zinc-900"
        }`}
      >
        <p className="text-xs font-semibold text-zinc-300">
          {horaBonita(cita.hora)}
        </p>

        <p className="mt-1 break-words font-bold">
          {cita.clientes?.nombre || "Cliente"}
        </p>

        <p className="mt-1 text-xs text-zinc-400">
          {cita.servicio}
        </p>

        <p className="mt-1 text-sm font-semibold">
          ${Number(cita.precio).toFixed(2)}
        </p>

        {cita.estado === "pagada" ? (
          <p className="mt-3 text-xs font-bold text-green-400">
            ✓ Pagada
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              disabled={procesando !== null}
              onClick={() => accion(cita.id, "pagar_cita")}
              className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-black disabled:opacity-50"
            >
              Marcar pagado
            </button>

            <button
              type="button"
              disabled={procesando !== null}
              onClick={() => accion(cita.id, "cancelar_cita")}
              className="rounded-lg border border-red-900 px-2 py-2 text-xs text-red-400 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver al Dashboard
        </Link>

        <header className="mt-8 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs text-zinc-500">
              DUMBO CUTZ / CITAS
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              📅 Calendario
            </h1>
            <p className="mt-2 text-zinc-400">
              Tus clientes y horarios en un solo lugar.
            </p>
          </div>

          <Link
            href="/dashboard/citas/nueva"
            className="rounded-xl bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200"
          >
            + Nueva cita
          </Link>
        </header>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navegar(-1)}
              className="rounded-lg border border-zinc-700 px-3 py-2"
            >
              ←
            </button>

            <button
              onClick={() => navegar(1)}
              className="rounded-lg border border-zinc-700 px-3 py-2"
            >
              →
            </button>

            <button
              onClick={() => setFecha(fechaISO(new Date()))}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
            >
              Hoy
            </button>

            <h2 className="ml-2 text-lg font-bold capitalize">
              {titulo}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["mes", "semana", "dia"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-lg px-4 py-2 text-sm capitalize ${
                  vista === v
                    ? "bg-white font-bold text-black"
                    : "border border-zinc-700 text-zinc-300"
                }`}
              >
                {v === "dia" ? "Día" : v === "mes" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-900 p-4 text-red-400">
            {error}
          </p>
        )}

        {cargando || !fecha ? (
          <p className="mt-10 text-zinc-400">
            Cargando calendario...
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className={vista === "mes" ? "min-w-[700px]" : "min-w-[770px]"}>
              {vista !== "dia" && (
                <div className="grid grid-cols-7 border-b border-zinc-800">
                  {dias.map((dia) => (
                    <div
                      key={dia}
                      className="p-3 text-center text-xs font-bold text-zinc-400"
                    >
                      {dia}
                    </div>
                  ))}
                </div>
              )}

              <div
                className={
                  vista === "dia"
                    ? "grid grid-cols-1"
                    : "grid grid-cols-7"
                }
              >
                {diasCalendario.map((dia) => {
                  const delMes =
                    dia.slice(0, 7) === fecha.slice(0, 7);
                  const esHoy = dia === fechaISO(new Date());
                  const citasDia = citasPorFecha[dia] || [];

                  return (
                    <div
                      key={dia}
                      className={`border-b border-r border-zinc-800 p-2 ${
                        vista === "mes" ? "min-h-36" : "min-h-80"
                      } ${
                        vista === "mes" && !delMes
                          ? "bg-zinc-950/50 opacity-50"
                          : ""
                      }`}
                    >
                      <button
                        onClick={() => {
                          setFecha(dia);
                          setVista("dia");
                        }}
                        className={`mb-3 rounded-lg px-2 py-1 text-sm font-semibold ${
                          esHoy
                            ? "bg-white text-black"
                            : "text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        {vista === "dia"
                          ? desdeISO(dia).toLocaleDateString("es-PR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })
                          : desdeISO(dia).getDate()}
                      </button>

                      <div className="space-y-2">
                        {citasDia.map(tarjetaCita)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-zinc-500">
          Desliza horizontalmente para ver todos los días en pantallas pequeñas.
          Las citas pagadas aparecen en verde.
        </p>
      </div>
    </main>
  );
}
