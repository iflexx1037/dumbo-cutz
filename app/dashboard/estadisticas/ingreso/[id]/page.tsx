"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Ingreso = {
  id: string;
  cliente_id: string | null;
  nombre_cliente: string;
  precio: number;
  servicio: string;
  fecha: string;
};

export default function EditarIngresoPage() {
  const params = useParams();
  const router = useRouter();

  const ingresoId = params.id as string;
  const supabase = createClient();

  const [ingreso, setIngreso] = useState<Ingreso | null>(null);
  const [servicio, setServicio] = useState("");
  const [precio, setPrecio] = useState("");
  const [fecha, setFecha] = useState("");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarIngreso();
  }, [ingresoId]);

  async function cargarIngreso() {
    setLoading(true);

    const { data, error } = await supabase
      .from("ingresos")
      .select("*")
      .eq("id", ingresoId)
      .single();

    if (error) {
      console.error(error);
      setError("No se pudo cargar el ingreso.");
      setLoading(false);
      return;
    }

    setIngreso(data);
    setServicio(data.servicio || "");
    setPrecio(data.precio?.toString() || "");

    if (data.fecha) {
      setFecha(new Date(data.fecha).toISOString().split("T")[0]);
    }

    setLoading(false);
  }

  async function guardarCambios(e: React.FormEvent) {
    e.preventDefault();

    setGuardando(true);
    setError("");

    if (!servicio.trim()) {
      setError("Escribe el servicio realizado.");
      setGuardando(false);
      return;
    }

    if (!precio || Number(precio) < 0) {
      setError("Escribe un precio válido.");
      setGuardando(false);
      return;
    }

    if (!fecha) {
      setError("Selecciona una fecha.");
      setGuardando(false);
      return;
    }

    const nuevaFecha = new Date(
      `${fecha}T12:00:00`
    ).toISOString();

    const { error: updateError } = await supabase
      .from("ingresos")
      .update({
        servicio: servicio.trim(),
        precio: Number(precio),
        fecha: nuevaFecha,
      })
      .eq("id", ingresoId);

    if (updateError) {
      console.error(updateError);
      setError("No se pudo actualizar el ingreso.");
      setGuardando(false);
      return;
    }

    // Actualizar el perfil del cliente
    // usando su ingreso más reciente.
    if (ingreso?.cliente_id) {
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
      }

      if (ultimoIngreso) {
        const fechaCliente = new Date(
          ultimoIngreso.fecha
        )
          .toISOString()
          .split("T")[0];

        await supabase
          .from("clientes")
          .update({
            corte_actual: ultimoIngreso.servicio,
            precio: Number(ultimoIngreso.precio),
            ultima_visita: fechaCliente,
          })
          .eq("id", ingreso.cliente_id);
      }
    }

    router.back();
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-500">
            Cargando ingreso...
          </div>
        </div>
      </main>
    );
  }

  if (!ingreso) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">

          <Link
            href="/dashboard/estadisticas"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Volver a estadísticas
          </Link>

          <div className="mt-8 rounded-3xl border border-red-900 bg-red-950/20 p-10 text-center">
            <h1 className="text-2xl font-bold">
              Ingreso no encontrado
            </h1>

            <p className="mt-2 text-zinc-500">
              No pudimos encontrar este ingreso.
            </p>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8">

          <Link
            href="/dashboard/estadisticas"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Volver a estadísticas
          </Link>

          <h1 className="mt-3 text-4xl font-bold">
            Editar ingreso
          </h1>

          <p className="mt-2 text-zinc-400">
            Cliente: {ingreso.nombre_cliente}
          </p>

        </div>

        <form
          onSubmit={guardarCambios}
          className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8"
        >

          {/* CLIENTE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Cliente
            </label>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              👤 {ingreso.nombre_cliente}
            </div>
          </div>

          {/* SERVICIO */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Servicio realizado
            </label>

            <textarea
              value={servicio}
              onChange={(e) => setServicio(e.target.value)}
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

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? "GUARDANDO..."
                : "GUARDAR CAMBIOS"}
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}