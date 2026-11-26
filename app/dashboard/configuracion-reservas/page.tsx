
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import SeguridadReservas from "./seguridad";

type Bloque = {
  hora_inicio: string;
  hora_fin: string;
};

type Horario = {
  dia_semana: number;
  activo: boolean;
  bloques: Bloque[];
};

type Servicio = {
  id: string;
  nombre: string;
  precio: number;
  duracion_minutos: number;
  activo: boolean;
};

type DiaBloqueado = {
  id: string;
  fecha: string;
  motivo: string | null;
};

type Configuracion = {
  reservas_activas: boolean;
  anticipacion_minutos: number;
};

type Pestana =
  | "horarios"
  | "dias"
  | "servicios"
  | "seguridad";

const nombresDias = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const campo =
  "w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white [color-scheme:dark]";

const boton =
  "rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200 disabled:opacity-40";

const tarjeta =
  "rounded-2xl border border-zinc-800 bg-zinc-950 p-5";

function fechaBonita(fecha: string) {
  return new Intl.DateTimeFormat("es-PR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));
}

function horaBonita(hora: string) {
  const [h, m] = hora.split(":").map(Number);

  if (h === 24) return "12:00 AM (día siguiente)";

  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${
    h >= 12 ? "PM" : "AM"
  }`;
}

function minutosHora(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function horasTotales(bloques: Bloque[]) {
  const minutos = bloques.reduce(
    (total, b) =>
      total +
      Math.max(
        0,
        minutosHora(b.hora_fin) -
          minutosHora(b.hora_inicio)
      ),
    0
  );

  const horas = Math.floor(minutos / 60);
  const restantes = minutos % 60;

  return `${horas} h${restantes ? ` ${restantes} min` : ""}`;
}

export default function ConfiguracionReservasPage() {
  const [pestana, setPestana] =
    useState<Pestana>("horarios");

  const [configuracion, setConfiguracion] =
    useState<Configuracion>({
      reservas_activas: false,
      anticipacion_minutos: 60,
    });

  const [horarios, setHorarios] =
    useState<Horario[]>([]);

  const [servicios, setServicios] =
    useState<Servicio[]>([]);

  const [bloqueados, setBloqueados] =
    useState<DiaBloqueado[]>([]);

  const [fechaBloqueada, setFechaBloqueada] =
    useState("");

  const [motivo, setMotivo] = useState("");

  const [editando, setEditando] =
    useState<Servicio | null>(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const bloqueo = useRef(false);

  async function obtenerDatos() {
    const respuesta = await fetch(
      "/api/admin/reservas",
      { cache: "no-store" }
    );

    const datos = await respuesta.json().catch(() => ({
      error: "Respuesta inválida del servidor.",
    }));

    if (!respuesta.ok) {
      throw new Error(
        datos.error || "No se pudieron cargar los datos."
      );
    }

    return datos;
  }

  async function cargarDatos() {
    const datos = await obtenerDatos();

    setConfiguracion(datos.configuracion);

    setHorarios(
      nombresDias.map((_, i) => {
        const existente = datos.horarios.find(
          (h: Horario) => h.dia_semana === i + 1
        );

        if (existente && !Array.isArray(existente.bloques)) {
          throw new Error(
            "Debes actualizar primero la API administrativa para admitir múltiples bloques."
          );
        }

        return {
          dia_semana: i + 1,
          activo: existente?.activo ?? false,
          bloques: (existente?.bloques ?? []).map(
            (b: Bloque) => ({
              hora_inicio: b.hora_inicio.slice(0, 5),
              hora_fin: b.hora_fin.slice(0, 5),
            })
          ),
        };
      })
    );

    setServicios(datos.servicios ?? []);
    setBloqueados(datos.bloqueados ?? []);
  }

  useEffect(() => {
    cargarDatos()
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  async function guardar(
    datos: Record<string, unknown>,
    despues?: () => Promise<void> | void
  ) {
    if (bloqueo.current) return;

    bloqueo.current = true;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(
        "/api/admin/reservas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datos),
        }
      );

      const resultado = await respuesta.json()
        .catch(() => ({
          error: "Respuesta inválida del servidor.",
        }));

      if (!respuesta.ok || !resultado.ok) {
        throw new Error(
          resultado.error || "No se pudo guardar."
        );
      }

      if (despues) {
        await despues();
      }

      setMensaje("Cambios guardados correctamente.");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error."
      );
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  }

  function actualizarHorario(
    indice: number,
    cambios: Partial<Horario>
  ) {
    setHorarios((anteriores) =>
      anteriores.map((h, i) =>
        i === indice ? { ...h, ...cambios } : h
      )
    );
  }

  function agregarBloque(indice: number) {
    setHorarios((anteriores) =>
      anteriores.map((h, i) =>
        i === indice
          ? {
              ...h,
              bloques: [
                ...h.bloques,
                {
                  hora_inicio: "15:00",
                  hora_fin: "17:00",
                },
              ],
            }
          : h
      )
    );

    setMensaje("");
  }

  function eliminarBloque(
    indice: number,
    bloque: number
  ) {
    setHorarios((anteriores) =>
      anteriores.map((h, i) =>
        i === indice
          ? {
              ...h,
              bloques: h.bloques.filter(
                (_, j) => j !== bloque
              ),
            }
          : h
      )
    );

    setMensaje("");
  }

  function actualizarBloque(
    indice: number,
    bloque: number,
    cambios: Partial<Bloque>
  ) {
    setHorarios((anteriores) =>
      anteriores.map((h, i) =>
        i === indice
          ? {
              ...h,
              bloques: h.bloques.map((b, j) =>
                j === bloque
                  ? { ...b, ...cambios }
                  : b
              ),
            }
          : h
      )
    );

    setMensaje("");
  }

  async function guardarHorarios() {
    setError("");
    setMensaje("");

    const regexHora =
      /^([01]\d|2[0-3]):[0-5]\d$/;

    const horariosOrdenados = horarios.map((h) => ({
      ...h,
      bloques: [...h.bloques].sort(
        (a, b) =>
          a.hora_inicio.localeCompare(b.hora_inicio)
      ),
    }));

    for (const h of horariosOrdenados) {
      const nombre = nombresDias[h.dia_semana - 1];

      if (h.activo && h.bloques.length === 0) {
        setError(
          `Añade al menos un bloque para el ${nombre}.`
        );
        return;
      }

      for (let i = 0; i < h.bloques.length; i++) {
        const b = h.bloques[i];

        if (
          !regexHora.test(b.hora_inicio) ||
          (
            !regexHora.test(b.hora_fin) &&
            b.hora_fin !== "24:00"
          ) ||
          b.hora_inicio >= b.hora_fin
        ) {
          setError(
            `Revisa las horas del ${nombre}. La apertura debe ser antes del cierre.`
          );
          return;
        }

        if (
          i > 0 &&
          b.hora_inicio <
            h.bloques[i - 1].hora_fin
        ) {
          setError(
            `Los bloques del ${nombre} se superponen.`
          );
          return;
        }
      }
    }

    await guardar(
      {
        accion: "horarios",
        horarios: horariosOrdenados,
      },
      () => setHorarios(horariosOrdenados)
    );
  }

  async function actualizarServicios() {
    const datos = await obtenerDatos();
    setServicios(datos.servicios ?? []);
  }

  async function actualizarBloqueados() {
    const datos = await obtenerDatos();
    setBloqueados(datos.bloqueados ?? []);
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Cargando configuración...
      </main>
    );
  }

  if (horarios.length === 0) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <p className="mb-5 text-red-400">
          {error || "No se pudo cargar el panel."}
        </p>

        <Link href="/dashboard">
          Volver al dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">

      <div className="mx-auto max-w-3xl space-y-6">

        <Link
          href="/dashboard"
          className="inline-block text-sm text-zinc-400"
        >
          ← Volver al dashboard
        </Link>

        <header>
          <p className="mb-2 text-xs tracking-[0.3em] text-zinc-500">
            DUMBO CUTZ
          </p>

          <h1 className="text-3xl font-bold">
            Configuración de reservas
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Administra tu disponibilidad, servicios y precios.
          </p>
        </header>

        {/* CONFIGURACIÓN GENERAL */}

        <section className={`${tarjeta} space-y-5`}>

          <div className="flex items-center justify-between gap-4">

            <div>
              <h2 className="font-semibold">
                Reservas online
              </h2>

              <p className={`mt-1 text-sm ${
                configuracion.reservas_activas
                  ? "text-green-400"
                  : "text-zinc-400"
              }`}>
                {configuracion.reservas_activas
                  ? "Reservas abiertas"
                  : "Reservas cerradas"}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-label="Reservas online"
              aria-checked={configuracion.reservas_activas}
              disabled={guardando}
              onClick={() =>
                setConfiguracion((c) => ({
                  ...c,
                  reservas_activas: !c.reservas_activas,
                }))
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                configuracion.reservas_activas
                  ? "bg-green-500"
                  : "bg-zinc-700"
              }`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                configuracion.reservas_activas
                  ? "left-6"
                  : "left-1"
              }`} />
            </button>

          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Anticipación mínima
            </label>

            <select
              value={configuracion.anticipacion_minutos}
              disabled={guardando}
              onChange={(e) =>
                setConfiguracion((c) => ({
                  ...c,
                  anticipacion_minutos: Number(e.target.value),
                }))
              }
              className={campo}
            >
              {Array.from(new Set([
                0, 15, 30, 60, 120, 180, 720, 1440,
                configuracion.anticipacion_minutos,
              ])).sort((a, b) => a - b).map((minutos) => (
                <option key={minutos} value={minutos}>
                  {minutos === 0
                    ? "Sin anticipación"
                    : minutos < 60
                      ? `${minutos} minutos`
                      : `${minutos / 60} horas`}
                </option>
              ))}
            </select>
          </div>

          <button
            disabled={guardando}
            onClick={() =>
              guardar(
                {
                  accion: "configuracion",
                  ...configuracion,
                },
                async () => {
                  const datos = await obtenerDatos();
                  setConfiguracion(datos.configuracion);
                }
              )
            }
            className={`${boton} w-full`}
          >
            Guardar configuración
          </button>

        </section>

        {/* PESTAÑAS */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl bg-zinc-900 p-2">

          {([
            ["horarios", "Horarios"],
            ["dias", "Días libres"],
            ["servicios", "Servicios"],
            ["seguridad", "Seguridad"],
          ] as const).map(([valor, texto]) => (
            <button
              key={valor}
              disabled={guardando}
              onClick={() => {
                setPestana(valor);
                setMensaje("");
                setError("");
              }}
              className={`rounded-xl px-2 py-3 text-sm font-semibold transition ${
                pestana === valor
                  ? "bg-white text-black"
                  : "text-zinc-400"
              }`}
            >
              {texto}
            </button>
          ))}

        </div>

        {/* HORARIOS CON MÚLTIPLES BLOQUES */}

        {pestana === "horarios" && (
          <section className="space-y-4">

            <h2 className="text-xl font-bold">
              Horario semanal
            </h2>

            <p className="text-sm text-zinc-400">
              Configura diferentes bloques de trabajo para cada día.
            </p>

            {horarios.map((h, i) => (
              <div
                key={h.dia_semana}
                className={`${tarjeta} space-y-4`}
              >

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="text-lg font-semibold">
                      {nombresDias[i]}
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500">
                      {h.activo
                        ? `${h.bloques.length} ${
                            h.bloques.length === 1
                              ? "bloque"
                              : "bloques"
                          } de trabajo`
                        : "No disponible"}
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-sm">

                    <input
                      type="checkbox"
                      checked={h.activo}
                      disabled={guardando}
                      onChange={(e) =>
                        actualizarHorario(i, {
                          activo: e.target.checked,
                          bloques:
                            e.target.checked &&
                            h.bloques.length === 0
                              ? [{
                                  hora_inicio: "09:00",
                                  hora_fin: "17:00",
                                }]
                              : h.bloques,
                        })
                      }
                      className="h-5 w-5 accent-white"
                    />

                    {h.activo ? "Abierto" : "Cerrado"}

                  </label>

                </div>

                {h.activo ? (
                  <div className="space-y-3">

                    {h.bloques.map((b, j) => (
                      <div
                        key={j}
                        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                      >

                        <div className="flex items-center justify-between">

                          <span className="text-sm font-semibold">
                            Bloque {j + 1}
                          </span>

                          <button
                            type="button"
                            disabled={guardando}
                            onClick={() =>
                              eliminarBloque(i, j)
                            }
                            className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 disabled:opacity-40"
                          >
                            Eliminar
                          </button>

                        </div>

                        <div className="grid grid-cols-2 gap-3">

                          <div>

                            <label className="mb-2 block text-xs text-zinc-400">
                              Desde
                            </label>

                            <input
                              type="time"
                              value={b.hora_inicio}
                              disabled={guardando}
                              onChange={(e) =>
                                actualizarBloque(i, j, {
                                  hora_inicio: e.target.value,
                                })
                              }
                              className={campo}
                            />

                          </div>

                          <div>

                            <label className="mb-2 block text-xs text-zinc-400">
                              Hasta
                            </label>

                            {b.hora_fin === "24:00" ? (
                              <div className={campo}>
                                12:00 AM
                              </div>
                            ) : (
                              <input
                                type="time"
                                value={b.hora_fin}
                                disabled={guardando}
                                onChange={(e) =>
                                  actualizarBloque(i, j, {
                                    hora_fin: e.target.value,
                                  })
                                }
                                className={campo}
                              />
                            )}

                          </div>

                        </div>

                        <label className="flex items-center gap-2 text-xs text-zinc-400">

                          <input
                            type="checkbox"
                            checked={b.hora_fin === "24:00"}
                            disabled={guardando}
                            onChange={(e) =>
                              actualizarBloque(i, j, {
                                hora_fin: e.target.checked
                                  ? "24:00"
                                  : "17:00",
                              })
                            }
                            className="accent-white"
                          />

                          Cerrar a medianoche

                        </label>

                        {b.hora_inicio &&
                          b.hora_fin && (
                          <p className="text-xs text-zinc-500">
                            {horaBonita(b.hora_inicio)}
                            {" — "}
                            {horaBonita(b.hora_fin)}
                          </p>
                        )}

                      </div>
                    ))}

                    {h.bloques.length === 0 && (
                      <p className="py-3 text-center text-sm text-zinc-500">
                        No hay bloques de trabajo.
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={
                        guardando ||
                        h.bloques.length >= 24
                      }
                      onClick={() => agregarBloque(i)}
                      className="w-full rounded-xl border border-dashed border-zinc-600 p-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 disabled:opacity-40"
                    >
                      + Añadir bloque de horario
                    </button>

                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">

                      <span className="text-xs text-zinc-500">
                        Total de horas
                      </span>

                      <span className="text-sm font-semibold">
                        {horasTotales(h.bloques)}
                      </span>

                    </div>

                  </div>
                ) : (
                  <p className="py-3 text-sm text-zinc-500">
                    Cerrado durante todo el día.
                  </p>
                )}

              </div>
            ))}

            <button
              disabled={guardando}
              onClick={guardarHorarios}
              className={`${boton} w-full`}
            >
              {guardando
                ? "Guardando horarios..."
                : "Guardar todos los horarios"}
            </button>

          </section>
        )}

        {/* DÍAS LIBRES */}

        {pestana === "dias" && (
          <section className="space-y-4">

            <h2 className="text-xl font-bold">
              Días libres
            </h2>

            <div className={`${tarjeta} space-y-4`}>

              <p className="text-sm text-zinc-400">
                Bloquea un día completo para impedir nuevas reservas.
              </p>

              <div>
                <label className="mb-2 block text-sm">
                  Fecha
                </label>

                <input
                  type="date"
                  value={fechaBloqueada}
                  disabled={guardando}
                  onChange={(e) =>
                    setFechaBloqueada(e.target.value)
                  }
                  className={campo}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Motivo (opcional)
                </label>

                <input
                  value={motivo}
                  disabled={guardando}
                  onChange={(e) =>
                    setMotivo(e.target.value)
                  }
                  placeholder="Vacaciones, competencia..."
                  maxLength={200}
                  className={campo}
                />
              </div>

              <button
                disabled={!fechaBloqueada || guardando}
                onClick={() =>
                  guardar(
                    {
                      accion: "bloquear_dia",
                      fecha: fechaBloqueada,
                      motivo,
                    },
                    async () => {
                      await actualizarBloqueados();
                      setFechaBloqueada("");
                      setMotivo("");
                    }
                  )
                }
                className={`${boton} w-full`}
              >
                Bloquear día
              </button>

              <p className="text-xs text-zinc-500">
                Las citas existentes no serán canceladas.
              </p>

            </div>

            {bloqueados.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500">
                No tienes días bloqueados.
              </p>
            )}

            {bloqueados.map((dia) => (
              <div
                key={dia.id}
                className={`${tarjeta} flex items-center justify-between gap-3`}
              >

                <div>
                  <p className="font-semibold">
                    {fechaBonita(dia.fecha)}
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    {dia.motivo || "Día libre"}
                  </p>
                </div>

                <button
                  disabled={guardando}
                  onClick={() =>
                    guardar(
                      {
                        accion: "desbloquear_dia",
                        id: dia.id,
                      },
                      actualizarBloqueados
                    )
                  }
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs"
                >
                  Desbloquear
                </button>

              </div>
            ))}

          </section>
        )}

        {/* SERVICIOS */}

        {pestana === "servicios" && (
          <section className="space-y-4">

            <div className="flex items-center justify-between gap-3">

              <h2 className="text-xl font-bold">
                Servicios y precios
              </h2>

              <button
                disabled={guardando}
                onClick={() =>
                  setEditando({
                    id: "",
                    nombre: "",
                    precio: 25,
                    duracion_minutos: 60,
                    activo: true,
                  })
                }
                className={boton}
              >
                + Añadir
              </button>

            </div>

            {editando && (
              <div className={`${tarjeta} space-y-4`}>

                <h3 className="text-lg font-bold">
                  {editando.id
                    ? "Editar servicio"
                    : "Nuevo servicio"}
                </h3>

                <div>
                  <label className="mb-2 block text-sm">
                    Nombre
                  </label>

                  <input
                    value={editando.nombre}
                    disabled={guardando}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        nombre: e.target.value,
                      })
                    }
                    placeholder="Ej. Recorte y barba"
                    maxLength={100}
                    className={campo}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div>
                    <label className="mb-2 block text-sm">
                      Precio ($)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editando.precio}
                      disabled={guardando}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          precio: Number(e.target.value),
                        })
                      }
                      className={campo}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">
                      Duración (min)
                    </label>

                    <input
                      type="number"
                      min="5"
                      max="720"
                      value={editando.duracion_minutos}
                      disabled={guardando}
                      onChange={(e) =>
                        setEditando({
                          ...editando,
                          duracion_minutos: Number(e.target.value),
                        })
                      }
                      className={campo}
                    />
                  </div>

                </div>

                <label className="flex items-center gap-3">

                  <input
                    type="checkbox"
                    checked={editando.activo}
                    disabled={guardando}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        activo: e.target.checked,
                      })
                    }
                    className="h-5 w-5 accent-white"
                  />

                  Disponible para reservas online

                </label>

                <div className="flex gap-3">

                  <button
                    disabled={guardando}
                    onClick={() => setEditando(null)}
                    className="flex-1 rounded-xl border border-zinc-700 p-3"
                  >
                    Cancelar
                  </button>

                  <button
                    disabled={
                      guardando ||
                      editando.nombre.trim().length < 2 ||
                      editando.precio < 0 ||
                      !Number.isInteger(editando.duracion_minutos) ||
                      editando.duracion_minutos < 5 ||
                      editando.duracion_minutos > 720
                    }
                    onClick={() =>
                      guardar(
                        {
                          accion: "guardar_servicio",
                          ...editando,
                        },
                        async () => {
                          await actualizarServicios();
                          setEditando(null);
                        }
                      )
                    }
                    className={`${boton} flex-1`}
                  >
                    Guardar
                  </button>

                </div>

              </div>
            )}

            {servicios.map((servicio) => (
              <div
                key={servicio.id}
                className={`${tarjeta} space-y-4`}
              >

                <div className="flex items-start justify-between gap-3">

                  <div>
                    <h3 className="text-lg font-semibold">
                      {servicio.nombre}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-400">
                      {servicio.duracion_minutos} minutos
                    </p>

                    <p className={`mt-2 text-xs ${
                      servicio.activo
                        ? "text-green-400"
                        : "text-zinc-500"
                    }`}>
                      {servicio.activo
                        ? "Activo"
                        : "Desactivado"}
                    </p>
                  </div>

                  <p className="text-2xl font-bold">
                    ${Number(servicio.precio).toFixed(2)}
                  </p>

                </div>

                <div className="flex gap-3">

                  <button
                    disabled={guardando}
                    onClick={() =>
                      setEditando({
                        ...servicio,
                        precio: Number(servicio.precio),
                      })
                    }
                    className="flex-1 rounded-xl border border-zinc-700 p-3 text-sm"
                  >
                    Editar
                  </button>

                  {servicio.activo ? (
                    <button
                      disabled={guardando}
                      onClick={() =>
                        guardar(
                          {
                            accion: "desactivar_servicio",
                            id: servicio.id,
                          },
                          actualizarServicios
                        )
                      }
                      className="flex-1 rounded-xl border border-red-900 p-3 text-sm text-red-400"
                    >
                      Desactivar
                    </button>
                  ) : (
                    <button
                      disabled={guardando}
                      onClick={() =>
                        guardar(
                          {
                            accion: "guardar_servicio",
                            ...servicio,
                            precio: Number(servicio.precio),
                            activo: true,
                          },
                          actualizarServicios
                        )
                      }
                      className="flex-1 rounded-xl border border-green-900 p-3 text-sm text-green-400"
                    >
                      Activar
                    </button>
                  )}

                </div>

              </div>
            ))}

          </section>
        )}

        {pestana === "seguridad" && (
  <SeguridadReservas />
)}

        {/* LÍMITE DE RESERVAS */}

        <section className={tarjeta}>

          <div className="flex items-center justify-between gap-3">

            <div>
              <h3 className="font-semibold">
                Límite por teléfono
              </h3>

              <p className="mt-1 text-xs text-zinc-400">
                La segunda cita requiere acompañante.
              </p>
            </div>

            <span className="text-xl font-bold">
              2 citas
            </span>

          </div>

        </section>

        {/* NOTIFICACIONES */}

        {(mensaje || error || guardando) && (
          <div
            role="status"
            className={`sticky bottom-4 rounded-xl border p-4 text-sm shadow-xl ${
              error
                ? "border-red-900 bg-red-950 text-red-300"
                : "border-zinc-700 bg-zinc-900 text-white"
            }`}
          >
            {guardando
              ? "Guardando cambios..."
              : error || mensaje}
          </div>
        )}

        <footer className="pb-5 text-center text-xs text-zinc-600">
          Dumbo Cutz · Administración
        </footer>

      </div>

    </main>
  );
}
