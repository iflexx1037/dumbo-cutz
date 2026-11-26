
"use client";

import { useEffect, useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

type Servicio = {
  id: string;
  nombre: string;
  precio: number;
  duracion_minutos: number;
};

type Paso = 1 | 2 | 3;

function fechaPuertoRico() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = partes.find(
    (p) => p.type === "year"
  )?.value;

  const month = partes.find(
    (p) => p.type === "month"
  )?.value;

  const day = partes.find(
    (p) => p.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function sumarDias(fecha: string, dias: number) {
  const nueva = new Date(`${fecha}T12:00:00Z`);

  nueva.setUTCDate(nueva.getUTCDate() + dias);

  return nueva.toISOString().slice(0, 10);
}

function horaNormal(hora: string) {
  const [h, m] = hora.split(":").map(Number);

  return `${h % 12 || 12}:${String(m).padStart(
    2,
    "0"
  )} ${h >= 12 ? "PM" : "AM"}`;
}

function fechaBonita(fecha: string) {
  if (!fecha) return "";

  return new Intl.DateTimeFormat("es-PR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));
}

function normalizarTelefono(telefono: string) {
  return telefono
    .replace(/\D/g, "")
    .replace(/^1(?=\d{10}$)/, "");
}

export default function ReservarPage() {
  const [paso, setPaso] = useState<Paso>(1);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const [servicios, setServicios] =
    useState<Servicio[]>([]);

  const [servicioId, setServicioId] =
    useState("");

  const [fecha, setFecha] = useState("");
  const [fechaMinima, setFechaMinima] =
    useState("");
  const [fechaMaxima, setFechaMaxima] =
    useState("");

  const [horarios, setHorarios] =
    useState<string[]>([]);

  const [hora, setHora] = useState("");

  const [cargandoServicios, setCargandoServicios] =
    useState(true);

  const [cargandoHorarios, setCargandoHorarios] =
    useState(false);

  const [error, setError] = useState("");

  const [errorServicios, setErrorServicios] =
    useState("");

  const [turnstileToken, setTurnstileToken] =
    useState("");

  const [widgetKey, setWidgetKey] =
    useState(0);

  const [confirmando, setConfirmando] =
    useState(false);

  const [reservaConfirmada, setReservaConfirmada] =
    useState(false);

  const [reservaId, setReservaId] =
    useState("");

  const [recargarHorarios, setRecargarHorarios] =
    useState(0);

  // NUEVO: Sistema de acompañantes

  const [requiereAcompanante, setRequiereAcompanante] =
    useState(false);

  const [nombreAcompanante, setNombreAcompanante] =
    useState("");

  const [relacionAcompanante, setRelacionAcompanante] =
    useState("");

  const [limiteAlcanzado, setLimiteAlcanzado] =
    useState(false);

  const bloqueoConfirmacion = useRef(false);

  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    const hoy = fechaPuertoRico();

    setFecha(hoy);
    setFechaMinima(hoy);
    setFechaMaxima(sumarDias(hoy, 30));

    const controlador = new AbortController();

    async function cargarServicios() {
      try {
        const respuesta = await fetch(
          "/api/reservas/servicios",
          {
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        if (!respuesta.ok) {
          throw new Error(
            "No se pudieron cargar los servicios."
          );
        }

        const datos = await respuesta.json();

        if (!controlador.signal.aborted) {
          setServicios(datos.servicios ?? []);
        }

      } catch (err) {
        if (!controlador.signal.aborted) {
          setErrorServicios(
            err instanceof Error
              ? err.message
              : "Ocurrió un error."
          );
        }

      } finally {
        if (!controlador.signal.aborted) {
          setCargandoServicios(false);
        }
      }
    }

fetch("/api/reservas", {
  cache: "no-store",
  credentials: "same-origin",
  signal: controlador.signal,
}).catch(() => {});

    cargarServicios();

    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (paso !== 3 || !fecha || !servicioId) {
      return;
    }

    const controlador = new AbortController();

    async function cargarHorarios() {
      setCargandoHorarios(true);
      setHorarios([]);
      setHora("");

      try {
        const parametros = new URLSearchParams({
          fecha,
          servicio_id: servicioId,
        });

        const respuesta = await fetch(
          `/api/reservas/disponibilidad?${parametros}`,
          {
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        if (!respuesta.ok) {
          throw new Error(
            "No se pudieron consultar los horarios."
          );
        }

        const datos = await respuesta.json();

        if (!controlador.signal.aborted) {
          setHorarios(datos.horarios ?? []);
        }

      } catch (err) {
        if (!controlador.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Ocurrió un error."
          );
        }

      } finally {
        if (!controlador.signal.aborted) {
          setCargandoHorarios(false);
        }
      }
    }

    cargarHorarios();

    return () => controlador.abort();

  }, [paso, fecha, servicioId, recargarHorarios]);

  const servicioSeleccionado = servicios.find(
    (s) => s.id === servicioId
  );

  const campo =
    "w-full rounded-xl border border-zinc-800 " +
    "bg-zinc-900 px-4 py-3 text-white outline-none " +
    "focus:border-white disabled:opacity-50";

  const boton =
    "w-full rounded-xl bg-white px-5 py-4 " +
    "font-semibold text-black transition " +
    "hover:bg-zinc-200 disabled:opacity-40 " +
    "disabled:cursor-not-allowed";

  function reiniciarVerificacion() {
    setTurnstileToken("");
    setWidgetKey((anterior) => anterior + 1);
  }

  function continuarDatos() {
    setError("");

    if (nombre.trim().length < 2) {
      setError("Escribe tu nombre completo.");
      return;
    }

    if (
      normalizarTelefono(telefono).length !== 10
    ) {
      setError(
        "Escribe un teléfono válido de 10 dígitos."
      );
      return;
    }

    setRequiereAcompanante(false);
    setNombreAcompanante("");
    setRelacionAcompanante("");
    setLimiteAlcanzado(false);

    setPaso(2);
  }

  function continuarServicio() {
    setError("");

    if (!servicioId) {
      setError("Selecciona un servicio.");
      return;
    }

    setHora("");
    setHorarios([]);

    reiniciarVerificacion();

    setPaso(3);
  }

  async function confirmarCita() {
    if (
      bloqueoConfirmacion.current ||
      reservaConfirmada ||
      limiteAlcanzado
    ) {
      return;
    }

    setError("");

    if (
      !nombre.trim() ||
      normalizarTelefono(telefono).length !== 10 ||
      !servicioId ||
      !fecha ||
      !hora ||
      !horarios.includes(hora) ||
      cargandoHorarios
    ) {
      setError("Completa los datos de tu cita.");
      return;
    }

    if (requiereAcompanante) {
      if (
        nombreAcompanante.trim().length < 2 ||
        !relacionAcompanante
      ) {
        setError(
          "Completa los datos del acompañante."
        );
        return;
      }

      if (
        nombreAcompanante.trim().toLowerCase() ===
        nombre.trim().toLowerCase()
      ) {
        setError(
          "La segunda cita debe ser para otra persona."
        );
        return;
      }
    }

    if (!turnstileToken) {
      setError(
        "Completa la verificación de seguridad."
      );
      return;
    }

    bloqueoConfirmacion.current = true;
    setConfirmando(true);

    try {
      const respuesta = await fetch(
        "/api/reservas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            telefono: normalizarTelefono(telefono),
            servicioId,
            fecha,
            hora: hora.slice(0, 5),
            turnstileToken,

            nombreAcompanante:
              requiereAcompanante
                ? nombreAcompanante.trim()
                : null,

            relacionAcompanante:
              requiereAcompanante
                ? relacionAcompanante
                : null,
          }),
        }
      );

      const datos = await respuesta.json()
        .catch(() => ({
          ok: false,
          error: `Error del servidor (${respuesta.status}).`,
        }));

      // SEGUNDA CITA

      if (
        datos.codigo === "ACOMPANANTE_REQUERIDO"
      ) {
        setRequiereAcompanante(true);
        reiniciarVerificacion();

        return;
      }

      // TERCERA CITA

      if (
        datos.codigo === "LIMITE_RESERVAS"
      ) {
        setLimiteAlcanzado(true);
        setTurnstileToken("");

        return;
      }

      // HORARIO OCUPADO

      if (
        datos.codigo === "HORARIO_OCUPADO"
      ) {
        setHora("");
        setHorarios([]);

        setRecargarHorarios(
          (anterior) => anterior + 1
        );
      }

      if (!respuesta.ok || !datos.ok) {
        throw new Error(
          datos.error ||
          "No se pudo confirmar la cita."
        );
      }

      setReservaId(datos.reservaId ?? "");
      setReservaConfirmada(true);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al reservar."
      );

      reiniciarVerificacion();

    } finally {
      bloqueoConfirmacion.current = false;
      setConfirmando(false);
    }
  }

  // PANTALLA: LÍMITE ALCANZADO

  if (limiteAlcanzado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">

          <p className="mb-8 text-sm font-semibold tracking-[0.35em] text-zinc-400">
            DUMBO CUTZ
          </p>

          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-4xl">
            !
          </div>

          <h1 className="text-3xl font-bold">
            Límite de reservas alcanzado
          </h1>

          <p className="mt-4 leading-relaxed text-zinc-400">
            Ya tienes dos citas activas asociadas
            a este número de teléfono.
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-sm text-zinc-400">
              Reservas activas
            </p>

            <p className="mt-2 text-4xl font-bold">
              2 / 2
            </p>

            <div className="mt-4 flex gap-2">
              <div className="h-2 flex-1 rounded-full bg-white" />
              <div className="h-2 flex-1 rounded-full bg-white" />
            </div>

          </div>

          <p className="mt-6 text-sm text-zinc-400">
            Podrás reservar nuevamente cuando una
            de tus citas se complete o sea cancelada.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`${boton} mt-8`}
          >
            Volver al inicio
          </button>

        </div>
      </main>
    );
  }

  // PANTALLA: CITA CONFIRMADA

  if (reservaConfirmada) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">

          <p className="mb-8 text-sm font-semibold tracking-[0.35em] text-zinc-400">
            DUMBO CUTZ
          </p>

          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-4xl text-green-400">
            ✓
          </div>

          <h1 className="text-3xl font-bold">
            ¡Cita confirmada!
          </h1>

          <p className="mt-3 text-zinc-400">
            Gracias, {nombre}. Tu cita fue
            reservada correctamente.
          </p>

          <div className="mt-8 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left">

            <div className="flex justify-between gap-3">
              <span className="text-zinc-400">
                Cliente
              </span>

              <span className="text-right font-semibold">
                {requiereAcompanante
                  ? nombreAcompanante
                  : nombre}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-zinc-400">
                Servicio
              </span>

              <span className="font-semibold">
                {servicioSeleccionado?.nombre}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-zinc-400">
                Fecha
              </span>

              <span className="text-right font-semibold">
                {fechaBonita(fecha)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-zinc-400">
                Hora
              </span>

              <span className="font-semibold">
                {horaNormal(hora)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-zinc-400">
                Duración
              </span>

              <span>
                {servicioSeleccionado?.duracion_minutos} min
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-700 pt-4">

              <span>Total</span>

              <span className="text-2xl font-bold">
                ${Number(
                  servicioSeleccionado?.precio ?? 0
                ).toFixed(2)}
              </span>

            </div>

          </div>

          {reservaId && (
            <p className="mt-5 text-xs text-zinc-500">
              Confirmación:{" "}
              {reservaId.slice(0, 8).toUpperCase()}
            </p>
          )}

          <p className="mt-6 text-sm text-zinc-400">
            Te esperamos. Gracias por confiar
            en Dumbo Cutz.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`${boton} mt-8`}
          >
            Volver al inicio
          </button>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-xl">

        <header className="mb-10 text-center">

          <div className="mb-3 text-sm font-semibold tracking-[0.35em] text-zinc-400">
            DUMBO CUTZ
          </div>

          <h1 className="text-4xl font-bold">
            Reserva tu cita
          </h1>

          <p className="mt-3 text-zinc-400">
            Agenda tu próximo recorte de forma
            rápida y sencilla.
          </p>

        </header>

        <div className="mb-8 flex items-center gap-2">

          {[1, 2, 3].map((numero) => (
            <div
              key={numero}
              className={`h-1.5 flex-1 rounded-full ${
                numero <= paso
                  ? "bg-white"
                  : "bg-zinc-800"
              }`}
            />
          ))}

        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">

          <p className="mb-2 text-sm text-zinc-500">
            PASO {paso} DE 3
          </p>

          {/* PASO 1 */}

          {paso === 1 && (
            <div className="space-y-6">

              <div>
                <h2 className="text-2xl font-bold">
                  Tus datos
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  No necesitas crear una cuenta.
                </p>
              </div>

              <div>
                <label
                  htmlFor="nombre"
                  className="mb-2 block text-sm text-zinc-300"
                >
                  Nombre completo
                </label>

                <input
                  id="nombre"
                  value={nombre}
                  autoComplete="name"
                  onChange={(e) =>
                    setNombre(e.target.value)
                  }
                  placeholder="Escribe tu nombre"
                  maxLength={100}
                  className={campo}
                />
              </div>

              <div>
                <label
                  htmlFor="telefono"
                  className="mb-2 block text-sm text-zinc-300"
                >
                  Número de teléfono
                </label>

                <input
                  id="telefono"
                  type="tel"
                  autoComplete="tel"
                  value={telefono}
                  onChange={(e) =>
                    setTelefono(e.target.value)
                  }
                  placeholder="787-000-0000"
                  maxLength={20}
                  className={campo}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={continuarDatos}
                className={boton}
              >
                Continuar
              </button>

              <p className="text-center text-xs text-zinc-500">
                Máximo de dos citas activas por
                número de teléfono.
              </p>

            </div>
          )}

          {/* PASO 2 */}

          {paso === 2 && (
            <div className="space-y-6">

              <div>
                <h2 className="text-2xl font-bold">
                  Selecciona tu servicio
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Escoge el servicio que deseas reservar.
                </p>
              </div>

              {cargandoServicios ? (
                <p className="text-zinc-400">
                  Cargando servicios...
                </p>
              ) : errorServicios ? (
                <p className="text-sm text-red-400">
                  {errorServicios}
                </p>
              ) : servicios.length === 0 ? (
                <p className="text-zinc-400">
                  No hay servicios disponibles.
                </p>
              ) : (
                <div className="space-y-3">

                  {servicios.map((servicio) => (
                    <button
                      key={servicio.id}
                      type="button"
                      aria-pressed={
                        servicioId === servicio.id
                      }
                      onClick={() => {
                        setServicioId(servicio.id);
                        setError("");
                      }}
                      className={`w-full rounded-2xl border p-5 text-left transition ${
                        servicioId === servicio.id
                          ? "border-white bg-zinc-800"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                      }`}
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div>
                          <h3 className="font-semibold">
                            {servicio.nombre}
                          </h3>

                          <p className="mt-1 text-sm text-zinc-400">
                            {servicio.duracion_minutos} minutos
                          </p>
                        </div>

                        <span className="text-lg font-bold">
                          ${Number(
                            servicio.precio
                          ).toFixed(2)}
                        </span>

                      </div>

                    </button>
                  ))}

                </div>
              )}

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setPaso(1);
                  }}
                  className="flex-1 rounded-xl border border-zinc-700 p-4 font-semibold"
                >
                  Atrás
                </button>

                <button
                  type="button"
                  onClick={continuarServicio}
                  disabled={!servicioId}
                  className={`${boton} flex-[2]`}
                >
                  Continuar
                </button>

              </div>

            </div>
          )}

          {/* PASO 3 */}

          {paso === 3 && (
            <div className="space-y-6">

              <div>
                <h2 className="text-2xl font-bold">
                  Fecha y hora
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Selecciona un horario disponible.
                </p>
              </div>

              <div>

                <label
                  htmlFor="fecha"
                  className="mb-2 block text-sm text-zinc-300"
                >
                  Selecciona la fecha
                </label>

                <input
                  id="fecha"
                  type="date"
                  min={fechaMinima}
                  max={fechaMaxima}
                  value={fecha}
                  disabled={confirmando}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setHora("");
                    setHorarios([]);
                    setError("");
                  }}
                  className={`${campo} [color-scheme:dark]`}
                />

              </div>

              <div>

                <h3 className="mb-4 font-semibold">
                  Horarios disponibles
                </h3>

                {cargandoHorarios ? (
                  <p className="text-sm text-zinc-400">
                    Consultando horarios...
                  </p>
                ) : horarios.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">

                    <p className="text-sm text-zinc-400">
                      No hay horarios disponibles
                      para esta fecha o las reservas
                      no están habilitadas.
                    </p>

                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">

                    {horarios.map((horario) => (
                      <button
                        key={horario}
                        type="button"
                        disabled={confirmando}
                        aria-pressed={hora === horario}
                        onClick={() => {
                          setHora(horario);
                          setError("");
                        }}
                        className={`rounded-xl border px-2 py-4 text-sm font-medium transition ${
                          hora === horario
                            ? "border-white bg-white text-black"
                            : "border-zinc-700 bg-zinc-900 text-white hover:border-white"
                        }`}
                      >
                        {horaNormal(horario)}
                      </button>
                    ))}

                  </div>
                )}

              </div>

              {/* NUEVO: SEGUNDA RESERVA */}

              {requiereAcompanante && (
                <div className="space-y-5 rounded-2xl border border-zinc-600 bg-zinc-900 p-5">

                  <div className="flex items-center justify-between gap-3">

                    <span className="text-xs font-semibold tracking-widest text-zinc-400">
                      SEGUNDA RESERVA
                    </span>

                    <span className="rounded-full border border-zinc-600 px-3 py-1 text-xs">
                      1 de 2 activas
                    </span>

                  </div>

                  <div>
                    <h3 className="text-xl font-bold">
                      ¿Para quién es esta cita?
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      Ya tienes una cita activa.
                      Puedes reservar un espacio
                      adicional para otra persona.
                    </p>
                  </div>

                  <div className="space-y-2">

                    {[
                      {
                        valor: "familiar",
                        texto: "Un familiar",
                      },
                      {
                        valor: "amigo",
                        texto: "Un amigo",
                      },
                      {
                        valor: "acompanante",
                        texto: "Un acompañante",
                      },
                      {
                        valor: "otro",
                        texto: "Otra persona",
                      },
                    ].map((opcion) => (
                      <button
                        key={opcion.valor}
                        type="button"
                        disabled={confirmando}
                        aria-pressed={
                          relacionAcompanante ===
                          opcion.valor
                        }
                        onClick={() => {
                          setRelacionAcompanante(
                            opcion.valor
                          );
                          setError("");
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm transition ${
                          relacionAcompanante ===
                          opcion.valor
                            ? "border-white bg-zinc-800"
                            : "border-zinc-700 bg-zinc-950"
                        }`}
                      >

                        {opcion.texto}

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            relacionAcompanante ===
                            opcion.valor
                              ? "border-white bg-white text-black"
                              : "border-zinc-600"
                          }`}
                        >
                          {relacionAcompanante ===
                            opcion.valor && "✓"}
                        </span>

                      </button>
                    ))}

                  </div>

                  <div>

                    <label
                      htmlFor="acompanante"
                      className="mb-2 block text-sm text-zinc-300"
                    >
                      Nombre de la persona
                    </label>

                    <input
                      id="acompanante"
                      value={nombreAcompanante}
                      disabled={confirmando}
                      onChange={(e) =>
                        setNombreAcompanante(
                          e.target.value
                        )
                      }
                      placeholder="Nombre completo"
                      maxLength={100}
                      className={campo}
                    />

                  </div>

                </div>
              )}

              {/* RESUMEN */}

              {servicioSeleccionado && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

                  <p className="mb-3 text-xs font-semibold tracking-widest text-zinc-500">
                    RESUMEN DE TU CITA
                  </p>

                  <p className="font-semibold">
                    {requiereAcompanante
                      ? nombreAcompanante ||
                        "Nombre del acompañante"
                      : nombre}
                  </p>

                  {requiereAcompanante && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Reservado por: {nombre}
                    </p>
                  )}

                  <p className="mt-2 text-sm text-zinc-400">
                    {servicioSeleccionado.nombre}
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    {fechaBonita(fecha)}
                    {hora
                      ? ` · ${horaNormal(hora)}`
                      : ""}
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    {servicioSeleccionado.duracion_minutos} minutos
                  </p>

                  <p className="mt-3 text-xl font-bold">
                    ${Number(
                      servicioSeleccionado.precio
                    ).toFixed(2)}
                  </p>

                </div>
              )}

              {/* TURNSTILE */}

              <div className="space-y-3">

                <p className="text-center text-xs text-zinc-500">
                  Verificación de seguridad
                </p>

                {siteKey ? (
                  <div className="flex w-full justify-center">

                    <Turnstile
                      key={widgetKey}
                      siteKey={siteKey}
                      onSuccess={(token) => {
                        setTurnstileToken(token);
                      }}
                      onExpire={() => {
                        reiniciarVerificacion();
                      }}
                      onError={() => {
                        setTurnstileToken("");

                        setError(
                          "No se pudo completar la verificación."
                        );
                      }}
                      options={{
                        theme: "dark",
                        size: "flexible",
                      }}
                    />

                  </div>
                ) : (
                  <p className="text-center text-sm text-red-400">
                    Falta configurar Turnstile.
                  </p>
                )}

                {turnstileToken && (
                  <p className="text-center text-xs text-green-400">
                    ✓ Verificación completada
                  </p>
                )}

              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-900 bg-red-950/30 p-4"
                >
                  <p className="text-sm text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-3">

                <button
                  type="button"
                  disabled={confirmando}
                  onClick={() => {
                    setError("");
                    setTurnstileToken("");
                    setPaso(2);
                  }}
                  className="flex-1 rounded-xl border border-zinc-700 p-4 font-semibold disabled:opacity-40"
                >
                  Atrás
                </button>

                <button
                  type="button"
                  onClick={confirmarCita}
                  disabled={
                    !hora ||
                    !horarios.includes(hora) ||
                    !turnstileToken ||
                    confirmando ||
                    cargandoHorarios ||
                    (
                      requiereAcompanante &&
                      (
                        nombreAcompanante.trim().length < 2 ||
                        !relacionAcompanante
                      )
                    )
                  }
                  className={`${boton} flex-[2]`}
                >
                  {confirmando
                    ? "Confirmando..."
                    : requiereAcompanante
                      ? "Confirmar segunda cita"
                      : "Confirmar cita"}
                </button>

              </div>

              <p className="text-center text-xs text-zinc-500">
                Tu cita se confirmará automáticamente
                si el horario continúa disponible.
              </p>

            </div>
          )}

        </div>

        <footer className="mt-8 text-center text-xs text-zinc-600">
          © Dumbo Cutz · Reservas online
        </footer>

      </div>
    </main>
  );
}
