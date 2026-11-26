
"use client";

import { useEffect, useState, useRef } from "react";

type Tipo = "telefono" | "ip" | "dispositivo";

type Reserva = {
  id: string;
  nombre_responsable: string | null;
  nombre_acompanante: string | null;
  telefono_reserva: string | null;
  fecha: string;
  hora: string;
  servicio: string;
  estado: string;
  tiene_ip: boolean;
  tiene_dispositivo: boolean;
};

type Regla = {
  id: string;
  tipo: Tipo;
  motivo: string | null;
  limite?: number;
};

const tarjeta =
  "rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4";

const campo =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none";

const boton =
  "rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40";

const secundario =
  "rounded-lg border border-zinc-700 px-3 py-2 text-xs disabled:opacity-40";

const peligro =
  "rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 disabled:opacity-40";

const nombres: Record<Tipo, string> = {
  telefono: "Teléfono",
  ip: "Dirección IP",
  dispositivo: "Navegador",
};

export default function SeguridadReservas() {
  const [actividad, setActividad] = useState<Reserva[]>([]);
  const [bloqueos, setBloqueos] = useState<Regla[]>([]);
  const [excepciones, setExcepciones] = useState<Regla[]>([]);

  const [telefono, setTelefono] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [limite, setLimite] = useState(4);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const bloqueo = useRef(false);

  async function cargar() {
    const respuesta = await fetch(
      "/api/admin/seguridad-reservas",
      { cache: "no-store" }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok || !datos.ok) {
      throw new Error(
        datos.error || "No se pudo cargar la seguridad."
      );
    }

    setActividad(datos.actividad ?? []);
    setBloqueos(datos.bloqueos ?? []);
    setExcepciones(datos.excepciones ?? []);
  }

  useEffect(() => {
    cargar()
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  async function guardar(
    datos: Record<string, unknown>
  ) {
    if (bloqueo.current) return false;

    bloqueo.current = true;
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(
        "/api/admin/seguridad-reservas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datos),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.ok) {
        throw new Error(
          resultado.error || "No se pudo guardar."
        );
      }

      await cargar();

      setMensaje("Cambios guardados correctamente.");

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error."
      );

      return false;
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  }

  async function bloquearReserva(
    cita: Reserva,
    tipo: Tipo
  ) {
    if (
      !window.confirm(
        `¿Bloquear ${nombres[tipo]} de esta reserva?`
      )
    ) return;

    await guardar({
      accion: "bloquear",
      cita_id: cita.id,
      tipo,
    });
  }

  async function autorizar(
    cita: Reserva,
    tipo: "ip" | "dispositivo"
  ) {
    if (
      !window.confirm(
        `¿Permitir hasta ${limite} citas activas para ${nombres[tipo]}?`
      )
    ) return;

    await guardar({
      accion: "crear_excepcion",
      cita_id: cita.id,
      tipo,
      limite,
    });
  }

  const filtradas = actividad.filter((c) =>
    [
      c.nombre_responsable,
      c.nombre_acompanante,
      c.telefono_reserva,
      c.servicio,
    ]
      .join(" ")
      .toLowerCase()
      .includes(busqueda.toLowerCase().trim())
  );

  if (cargando) {
    return (
      <p className="py-8 text-center text-zinc-400">
        Cargando seguridad...
      </p>
    );
  }

  return (
    <section className="space-y-5">

      <div>
        <h2 className="text-xl font-bold">
          Seguridad de reservas
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          Controla las reservas sospechosas y administra
          los accesos restringidos.
        </p>
      </div>

      <div className={tarjeta}>
        <h3 className="font-semibold">
          Límites de protección
        </h3>

        {[
          "Número de teléfono",
          "Dirección IP",
          "Navegador",
        ].map((texto) => (
          <div
            key={texto}
            className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3"
          >
            <span className="text-sm text-zinc-400">
              {texto}
            </span>

            <span className="font-semibold">
              2 citas
            </span>
          </div>
        ))}

        <p className="text-xs text-zinc-500">
          Límites predeterminados de citas futuras activas.
          Las excepciones pueden aumentar los límites de
          IP y navegador.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">

        <div className={tarjeta}>
          <p className="text-xs text-zinc-400">
            Bloqueos activos
          </p>
          <p className="text-3xl font-bold">
            {bloqueos.length}
          </p>
        </div>

        <div className={tarjeta}>
          <p className="text-xs text-zinc-400">
            Excepciones activas
          </p>
          <p className="text-3xl font-bold">
            {excepciones.length}
          </p>
        </div>

      </div>

      <div className={tarjeta}>

        <h3 className="font-semibold">
          Bloquear número de teléfono
        </h3>

        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="787-000-0000"
          maxLength={20}
          className={campo}
        />

        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo del bloqueo (opcional)"
          maxLength={200}
          className={campo}
        />

        <button
          disabled={guardando || !telefono.trim()}
          className={`${peligro} w-full py-3`}
          onClick={async () => {
            if (!window.confirm("¿Bloquear este número?")) {
              return;
            }

            const ok = await guardar({
              accion: "bloquear",
              tipo: "telefono",
              telefono,
              motivo,
            });

            if (ok) {
              setTelefono("");
              setMotivo("");
            }
          }}
        >
          Bloquear teléfono
        </button>

      </div>

      <div className={tarjeta}>

        <h3 className="font-semibold">
          Lista de bloqueos
        </h3>

        {bloqueos.length === 0 && (
          <p className="text-sm text-zinc-500">
            No tienes bloqueos activos.
          </p>
        )}

        {bloqueos.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {nombres[b.tipo]}
              </p>

              <p className="mt-1 break-words text-xs text-zinc-400">
                {b.motivo || "Bloqueo administrativo"}
              </p>
            </div>

            <button
              disabled={guardando}
              className={secundario}
              onClick={() =>
                guardar({
                  accion: "desbloquear",
                  id: b.id,
                })
              }
            >
              Desbloquear
            </button>
          </div>
        ))}

      </div>

      <div className={tarjeta}>

        <h3 className="font-semibold">
          Excepciones autorizadas
        </h3>

        <p className="text-sm text-zinc-400">
          Permite más citas desde una conexión o navegador
          compartido por clientes de confianza.
        </p>

        {excepciones.length === 0 && (
          <p className="text-sm text-zinc-500">
            No tienes excepciones activas.
          </p>
        )}

        {excepciones.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {nombres[e.tipo]} · {e.limite} citas
              </p>

              <p className="mt-1 break-words text-xs text-zinc-400">
                {e.motivo}
              </p>
            </div>

            <button
              disabled={guardando}
              className={peligro}
              onClick={() =>
                guardar({
                  accion: "eliminar_excepcion",
                  id: e.id,
                })
              }
            >
              Eliminar
            </button>
          </div>
        ))}

      </div>

      <div className={tarjeta}>

        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">
            Actividad de reservas
          </h3>

          <button
            disabled={guardando}
            className={secundario}
            onClick={() => {
              setError("");
              cargar().catch((err) => setError(err.message));
            }}
          >
            Actualizar
          </button>
        </div>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar nombre o teléfono..."
          className={campo}
        />

        <label className="block text-sm text-zinc-400">
          Límite para nuevas excepciones
        </label>

        <select
          value={limite}
          onChange={(e) => setLimite(Number(e.target.value))}
          className={campo}
        >
          {[3, 4, 5, 6, 8, 10, 15, 20].map((n) => (
            <option key={n} value={n}>
              {n} citas activas
            </option>
          ))}
        </select>

        {filtradas.length === 0 && (
          <p className="py-5 text-center text-sm text-zinc-500">
            No se encontraron reservas.
          </p>
        )}

        {filtradas.map((c) => (
          <div
            key={c.id}
            className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
          >

            <div className="flex items-start justify-between gap-3">

              <div>
                <h4 className="font-semibold">
                  {c.nombre_responsable || "Cliente"}
                </h4>

                <p className="mt-1 text-sm text-zinc-400">
                  {c.telefono_reserva || "Sin teléfono"}
                </p>
              </div>

              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">
                {c.estado}
              </span>

            </div>

            <p className="text-sm text-zinc-400">
              {c.servicio} · {c.fecha} · {c.hora.slice(0, 5)}
            </p>

            {c.nombre_acompanante && (
              <p className="text-xs text-zinc-400">
                Acompañante: {c.nombre_acompanante}
              </p>
            )}

            <div className="flex flex-wrap gap-2">

              <button
                disabled={guardando || !c.telefono_reserva}
                className={peligro}
                onClick={() => bloquearReserva(c, "telefono")}
              >
                Bloquear teléfono
              </button>

              <button
                disabled={guardando || !c.tiene_ip}
                className={peligro}
                onClick={() => bloquearReserva(c, "ip")}
              >
                Bloquear IP
              </button>

              <button
                disabled={guardando || !c.tiene_dispositivo}
                className={peligro}
                onClick={() => bloquearReserva(c, "dispositivo")}
              >
                Bloquear navegador
              </button>

            </div>

            <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">

              <button
                disabled={guardando || !c.tiene_ip}
                className={secundario}
                onClick={() => autorizar(c, "ip")}
              >
                Autorizar IP
              </button>

              <button
                disabled={guardando || !c.tiene_dispositivo}
                className={secundario}
                onClick={() => autorizar(c, "dispositivo")}
              >
                Autorizar navegador
              </button>

            </div>

          </div>
        ))}

        <p className="text-xs text-zinc-500">
          Se muestran las últimas 100 reservas online.
          Los bloqueos no cancelan citas existentes.
        </p>

      </div>

      {(error || mensaje || guardando) && (
        <div
          role="status"
          className={`sticky bottom-4 rounded-xl border p-4 text-sm ${
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

    </section>
  );
}
