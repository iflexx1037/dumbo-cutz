
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nombre: string;
  precio: number | null;
};

function obtenerFechaPuertoRico() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const obtener = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
}

export default function NuevaCitaPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const guardandoRef = useRef(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [servicio, setServicio] = useState("Recorte");
  const [precio, setPrecio] = useState("");
  const [notas, setNotas] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarClientes() {
      setCargando(true);

      const { data, error: consultaError } = await supabase
        .from("clientes")
        .select("id, nombre, precio")
        .order("nombre", { ascending: true });

      if (!activo) return;

      if (consultaError) {
        setError(
          "No se pudieron cargar los clientes: " +
            consultaError.message
        );
      } else {
        setClientes((data || []) as Cliente[]);
      }

      setCargando(false);
    }

    setFecha(obtenerFechaPuertoRico());
    void cargarClientes();

    return () => {
      activo = false;
    };
  }, [supabase]);

  function seleccionarCliente(id: string) {
    setClienteId(id);
    setExito("");

    const cliente = clientes.find(
      (item) => item.id === id
    );

    if (cliente && cliente.precio != null) {
      setPrecio(String(cliente.precio));
    } else {
      setPrecio("");
    }
  }

  function limpiarFormulario() {
    setClienteId("");
    setFecha(obtenerFechaPuertoRico());
    setHora("");
    setServicio("Recorte");
    setPrecio("");
    setNotas("");
  }

  async function guardarCita(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    // Evita dos envíos simultáneos.
    if (guardandoRef.current) return;

    setError("");
    setExito("");

    const cantidad = Number(precio);

    if (
      !clienteId ||
      !fecha ||
      !hora ||
      !servicio.trim() ||
      !precio.trim() ||
      !Number.isFinite(cantidad) ||
      cantidad < 0
    ) {
      setError(
        "Completa todos los campos correctamente."
      );
      return;
    }

    guardandoRef.current = true;
    setGuardando(true);

    const fechaCita = fecha;

    try {
      const { error: guardarError } = await supabase
        .from("citas")
        .insert({
          cliente_id: clienteId,
          fecha: fechaCita,
          hora,
          servicio: servicio.trim(),
          precio: cantidad,
          notas: notas.trim() || null,
          estado: "programada",
        });

      if (guardarError) {
        setError(
          "No se pudo guardar la cita: " +
            guardarError.message
        );
        return;
      }

      // Solo limpiamos cuando Supabase confirma
      // que la cita se guardó correctamente.
      limpiarFormulario();

      setExito(
        "¡Cita guardada correctamente!"
      );

      // Volver al calendario de la fecha registrada.
      // No utilizamos router.refresh() aquí porque
      // podría conservar el estado anterior del formulario.
      router.push(
        `/dashboard/citas?fecha=${encodeURIComponent(
          fechaCita
        )}`
      );
    } catch (err) {
      console.error(
        "Error inesperado al guardar cita:",
        err
      );

      setError(
        "Ocurrió un error inesperado. Comprueba si la cita se guardó antes de intentarlo otra vez."
      );
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  const campo =
    "w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none focus:border-zinc-500";

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/citas"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a Citas
        </Link>

        <h1 className="mt-8 text-4xl font-bold">
          Nueva cita
        </h1>

        <p className="mt-3 text-zinc-400">
          Agenda un cliente en tu calendario.
        </p>

        <form
          onSubmit={guardarCita}
          className="mt-8 space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
        >
          {/* CLIENTE */}
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Seleccionar cliente
            </label>

            <select
              value={clienteId}
              onChange={(e) =>
                seleccionarCliente(e.target.value)
              }
              className={campo}
              required
              disabled={cargando || guardando}
            >
              <option value="">
                {cargando
                  ? "Cargando clientes..."
                  : "Selecciona un cliente"}
              </option>

              {clientes.map((cliente) => (
                <option
                  key={cliente.id}
                  value={cliente.id}
                >
                  {cliente.nombre}
                </option>
              ))}
            </select>

            <Link
              href="/dashboard/clientes/nuevo"
              className="mt-2 inline-block text-sm text-zinc-400 underline hover:text-white"
            >
              ¿No aparece? Crear nuevo cliente
            </Link>
          </div>

          {/* FECHA Y HORA */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Fecha
              </label>

              <input
                type="date"
                required
                value={fecha}
                onChange={(e) =>
                  setFecha(e.target.value)
                }
                disabled={guardando}
                className={campo}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Hora
              </label>

              <input
                type="time"
                required
                value={hora}
                onChange={(e) =>
                  setHora(e.target.value)
                }
                disabled={guardando}
                className={campo}
              />
            </div>
          </div>

          {/* SERVICIO */}
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Servicio
            </label>

            <input
              value={servicio}
              onChange={(e) =>
                setServicio(e.target.value)
              }
              required
              disabled={guardando}
              className={campo}
              placeholder="Ej. Recorte y barba"
            />
          </div>

          {/* PRECIO */}
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Precio ($)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={precio}
              onChange={(e) =>
                setPrecio(e.target.value)
              }
              disabled={guardando}
              className={campo}
            />
          </div>

          {/* NOTAS */}
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Notas (opcional)
            </label>

            <textarea
              rows={3}
              value={notas}
              onChange={(e) =>
                setNotas(e.target.value)
              }
              disabled={guardando}
              className={campo}
              placeholder="Detalles de la cita..."
            />
          </div>

          {/* ERROR */}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          {/* ÉXITO */}
          {exito && (
            <p
              role="status"
              className="rounded-xl border border-green-900 bg-green-950/30 p-3 text-sm text-green-400"
            >
              {exito}
            </p>
          )}

          {/* GUARDAR */}
          <button
            type="submit"
            disabled={guardando || cargando}
            className="w-full rounded-xl bg-white p-4 font-bold text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            {guardando
              ? "Guardando cita..."
              : "Guardar cita"}
          </button>
        </form>
      </div>
    </main>
  );
}
