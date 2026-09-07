"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nombre: string;
  precio: number | null;
  corte_actual: string | null;
};

export default function NuevoIngresoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const [tipoCliente, setTipoCliente] = useState<"existente" | "nuevo">(
    "existente"
  );

  const [clienteId, setClienteId] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [servicio, setServicio] = useState("");
  const [precio, setPrecio] = useState("");
  const [fecha, setFecha] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarClientes();

    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split("T")[0];
    setFecha(fechaHoy);
  }, []);

  async function cargarClientes() {
    setLoadingClientes(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, precio, corte_actual")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando clientes:", error);
      setError("No se pudieron cargar los clientes.");
      setLoadingClientes(false);
      return;
    }

    setClientes(data || []);
    setLoadingClientes(false);
  }

  function seleccionarCliente(id: string) {
    setClienteId(id);

    const cliente = clientes.find((c) => c.id === id);

    if (!cliente) return;

    if (cliente.precio !== null) {
      setPrecio(cliente.precio.toString());
    }

    if (cliente.corte_actual) {
      setServicio(cliente.corte_actual);
    }
  }

  async function guardarIngreso(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    if (tipoCliente === "existente" && !clienteId) {
      setError("Selecciona un cliente.");
      setLoading(false);
      return;
    }

    if (tipoCliente === "nuevo" && !nombreNuevo.trim()) {
      setError("Escribe el nombre del cliente nuevo.");
      setLoading(false);
      return;
    }

    if (!servicio.trim()) {
      setError("Escribe el servicio realizado.");
      setLoading(false);
      return;
    }

    if (!precio || Number(precio) < 0) {
      setError("Escribe un precio válido.");
      setLoading(false);
      return;
    }

    if (!fecha) {
      setError("Selecciona una fecha.");
      setLoading(false);
      return;
    }

    let clienteFinalId: string | null = null;
    let nombreFinal = "";

    /*
      CLIENTE EXISTENTE
    */
    if (tipoCliente === "existente") {
      const cliente = clientes.find((c) => c.id === clienteId);

      if (!cliente) {
        setError("No encontramos ese cliente.");
        setLoading(false);
        return;
      }

      clienteFinalId = cliente.id;
      nombreFinal = cliente.nombre;
    }

    /*
      CLIENTE NUEVO
    */
    if (tipoCliente === "nuevo") {
      const { data: nuevoCliente, error: nuevoClienteError } =
        await supabase
          .from("clientes")
          .insert({
            nombre: nombreNuevo.trim(),
            corte_actual: servicio.trim(),
            precio: Number(precio),
            ultima_visita: fecha,
          })
          .select()
          .single();

      if (nuevoClienteError) {
        console.error(nuevoClienteError);
        setError("No se pudo crear el cliente nuevo.");
        setLoading(false);
        return;
      }

      clienteFinalId = nuevoCliente.id;
      nombreFinal = nuevoCliente.nombre;
    }

    /*
      CREAR INGRESO
    */
    const fechaIngreso = new Date(`${fecha}T12:00:00`).toISOString();

    const { error: ingresoError } = await supabase
      .from("ingresos")
      .insert({
        cliente_id: clienteFinalId,
        cliente_nuevo: tipoCliente === "nuevo",
        nombre_cliente: nombreFinal,
        precio: Number(precio),
        servicio: servicio.trim(),
        fecha: fechaIngreso,
      });

    if (ingresoError) {
      console.error(ingresoError);
      setError("No se pudo registrar el ingreso.");
      setLoading(false);
      return;
    }

    /*
      ACTUALIZAR CLIENTE EXISTENTE
    */
    if (tipoCliente === "existente" && clienteFinalId) {
      const { error: updateError } = await supabase
        .from("clientes")
        .update({
          corte_actual: servicio.trim(),
          precio: Number(precio),
          ultima_visita: fecha,
        })
        .eq("id", clienteFinalId);

      if (updateError) {
        console.error(updateError);
        setError(
          "El ingreso se guardó, pero hubo un problema actualizando el cliente."
        );
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard/estadisticas");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">

        {/* HEADER */}
        <div className="mb-8">
          <Link
            href="/dashboard/estadisticas"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Volver a estadísticas
          </Link>

          <h1 className="mt-3 text-4xl font-bold">
            Crear ingreso
          </h1>

          <p className="mt-2 text-zinc-400">
            Registra un corte y su pago.
          </p>
        </div>

        <form
          onSubmit={guardarIngreso}
          className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8"
        >

          {/* TIPO DE CLIENTE */}
          <div>
            <label className="mb-3 block text-sm font-medium text-zinc-300">
              Cliente
            </label>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() => setTipoCliente("existente")}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  tipoCliente === "existente"
                    ? "border-white bg-white text-black"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <div className="text-lg font-bold">
                  👤 Cliente existente
                </div>

                <div className="mt-1 text-xs opacity-70">
                  Ya está registrado
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoCliente("nuevo")}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  tipoCliente === "nuevo"
                    ? "border-white bg-white text-black"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <div className="text-lg font-bold">
                  🆕 Cliente nuevo
                </div>

                <div className="mt-1 text-xs opacity-70">
                  Primera vez
                </div>
              </button>

            </div>
          </div>

          {/* CLIENTE EXISTENTE */}
          {tipoCliente === "existente" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Selecciona el cliente
              </label>

              <select
                value={clienteId}
                onChange={(e) => seleccionarCliente(e.target.value)}
                disabled={loadingClientes}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
              >
                <option value="">
                  {loadingClientes
                    ? "Cargando clientes..."
                    : "Selecciona un cliente"}
                </option>

                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CLIENTE NUEVO */}
          {tipoCliente === "nuevo" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Nombre del cliente
              </label>

              <input
                type="text"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder="Ej. Pedro Rodríguez"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
              />

              <p className="mt-2 text-xs text-zinc-600">
                Se creará automáticamente su perfil básico.
              </p>
            </div>
          )}

          {/* SERVICIO */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Servicio realizado
            </label>

            <textarea
              value={servicio}
              onChange={(e) => setServicio(e.target.value)}
              placeholder="Ej. High fade + barba + cejas"
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          {/* PRECIO */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Precio
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>

              <input
                type="number"
                step="0.01"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="25.00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 pl-8 pr-4 text-white outline-none focus:border-white"
              />
            </div>
          </div>

          {/* FECHA */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Fecha
            </label>

            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* BOTONES */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

            <Link
              href="/dashboard/estadisticas"
              className="rounded-xl border border-zinc-700 px-6 py-3 text-center font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "GUARDANDO..." : "GUARDAR INGRESO"}
            </button>

          </div>

        </form>
      </div>
    </main>
  );
}