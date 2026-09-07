"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoClientePage() {
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [temasConversacion, setTemasConversacion] = useState("");
  const [corteActual, setCorteActual] = useState("");
  const [precio, setPrecio] = useState("");
  const [frecuencia, setFrecuencia] = useState("");
  const [ultimaVisita, setUltimaVisita] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function guardarCliente(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.from("clientes").insert({
      nombre,
      telefono: telefono || null,
      temas_conversacion: temasConversacion || null,
      corte_actual: corteActual || null,
      precio: precio ? Number(precio) : null,
      frecuencia: frecuencia || null,
      ultima_visita: ultimaVisita || null,
    });

    if (error) {
      console.error(error);
      setError("No se pudo guardar el cliente.");
      setLoading(false);
      return;
    }

    router.push("/dashboard/clientes");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8">
          <Link
            href="/dashboard/clientes"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Volver a clientes
          </Link>

          <h1 className="mt-3 text-4xl font-bold">
            Nuevo cliente
          </h1>

          <p className="mt-2 text-zinc-400">
            Añade la información de tu cliente.
          </p>
        </div>

        <form
          onSubmit={guardarCliente}
          className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8"
        >

          {/* NOMBRE */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Nombre *
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          {/* TELÉFONO */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Número de teléfono
            </label>

            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 787-000-0000"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          {/* TEMAS DE CONVERSACIÓN */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              ¿De qué le gusta hablar?
            </label>

            <textarea
              value={temasConversacion}
              onChange={(e) => setTemasConversacion(e.target.value)}
              placeholder="Ej. Carros, deportes, gym..."
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          {/* CORTE */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              ¿Qué se hace a detalle?
            </label>

            <textarea
              value={corteActual}
              onChange={(e) => setCorteActual(e.target.value)}
              placeholder="Ej. Low fade, 2 arriba, cerquillo, barba..."
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          {/* PRECIO + FRECUENCIA */}
          <div className="grid gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                ¿Cuánto me paga?
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

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                ¿Cada cuánto viene?
              </label>

              <input
                type="text"
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value)}
                placeholder="Ej. Cada 2 semanas"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

          </div>

          {/* ÚLTIMA VISITA */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              ¿Cuándo fue su última visita?
            </label>

            <input
              type="date"
              value={ultimaVisita}
              onChange={(e) => setUltimaVisita(e.target.value)}
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
              href="/dashboard/clientes"
              className="rounded-xl border border-zinc-700 px-6 py-3 text-center font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "GUARDANDO..." : "GUARDAR CLIENTE"}
            </button>

          </div>

        </form>
      </div>
    </main>
  );
}