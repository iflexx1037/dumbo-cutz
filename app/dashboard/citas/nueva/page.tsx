
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nombre: string;
  precio: number | null;
};

export default function NuevaCitaPage() {
  const router = useRouter();

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

  useEffect(() => {
    let activo = true;

    async function cargarClientes() {
      const supabase = createClient();

      const { data, error: consultaError } = await supabase
        .from("clientes")
        .select("id, nombre, precio")
        .order("nombre", { ascending: true });

      if (!activo) return;

      if (consultaError) {
        setError("No se pudieron cargar los clientes: " + consultaError.message);
      } else {
        setClientes((data || []) as Cliente[]);
      }

      setCargando(false);
    }

    cargarClientes();

    return () => {
      activo = false;
    };
  }, []);

  function seleccionarCliente(id: string) {
    setClienteId(id);

    const cliente = clientes.find((item) => item.id === id);

    if (cliente && cliente.precio != null) {
      setPrecio(String(cliente.precio));
    } else {
      setPrecio("");
    }
  }

  async function guardarCita(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cantidad = Number(precio);

    if (!clienteId || !fecha || !hora || !servicio.trim() ||
        !precio.trim() || !Number.isFinite(cantidad) || cantidad < 0) {
      setError("Completa todos los campos correctamente.");
      return;
    }

    setGuardando(true);

    const supabase = createClient();

    const { error: guardarError } = await supabase
      .from("citas")
      .insert({
        cliente_id: clienteId,
        fecha,
        hora,
        servicio: servicio.trim(),
        precio: cantidad,
        notas: notas.trim() || null,
        estado: "programada",
      });

    if (guardarError) {
      setError("No se pudo guardar la cita: " + guardarError.message);
      setGuardando(false);
      return;
    }

    router.push(`/dashboard/citas?fecha=${fecha}`);
    router.refresh();
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
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Seleccionar cliente
            </label>

            <select
              value={clienteId}
              onChange={(e) => seleccionarCliente(e.target.value)}
              className={campo}
              required
              disabled={cargando}
            >
              <option value="">
                {cargando ? "Cargando clientes..." : "Selecciona un cliente"}
              </option>

              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
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

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
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
                onChange={(e) => setHora(e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Servicio
            </label>
            <input
              value={servicio}
              onChange={(e) => setServicio(e.target.value)}
              required
              className={campo}
              placeholder="Ej. Recorte y barba"
            />
          </div>

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
              onChange={(e) => setPrecio(e.target.value)}
              className={campo}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Notas (opcional)
            </label>
            <textarea
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className={campo}
              placeholder="Detalles de la cita..."
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando || cargando}
            className="w-full rounded-xl bg-white p-4 font-bold text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            {guardando ? "Guardando cita..." : "Guardar cita"}
          </button>
        </form>
      </div>
    </main>
  );
}
