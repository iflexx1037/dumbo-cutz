
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoIngresoAsicalePage() {
  const router = useRouter();

  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("Camisas");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ahora = new Date();
    const fechaLocal = new Date(
      ahora.getTime() - ahora.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 10);

    setFecha(fechaLocal);
  }, []);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cantidad = Number(monto);

    if (
      !descripcion.trim() ||
      !categoria ||
      !fecha ||
      !monto.trim() ||
      !Number.isFinite(cantidad) ||
      cantidad <= 0
    ) {
      setError("Completa correctamente los campos.");
      return;
    }

    setGuardando(true);

    const supabase = createClient();

    const { error: guardarError } = await supabase
      .from("ingresos_asicale")
      .insert({
        descripcion: descripcion.trim(),
        categoria,
        monto: cantidad,
        fecha,
        notas: notas.trim() || null,
      });

    if (guardarError) {
      setError(guardarError.message);
      setGuardando(false);
      return;
    }

    router.push("/dashboard/asicale/ingresos");
    router.refresh();
  }

  const campo =
    "w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none focus:border-zinc-500";

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/asicale/ingresos"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a Ingresos
        </Link>

        <h1 className="mt-8 text-4xl font-bold">
          Nuevo ingreso
        </h1>

        <p className="mt-3 text-zinc-400">
          Registra una venta de Asicale Club.
        </p>

        <form
          onSubmit={guardar}
          className="mt-8 space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Descripción
            </label>
            <input
              className={campo}
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Venta de camisa negra"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Categoría
            </label>
            <select
              className={campo}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {["Camisas", "Hoodies", "Medias", "Accesorios", "Eventos", "Otros"].map(
                (opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Cantidad ($)
            </label>
            <input
              className={campo}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Fecha
            </label>
            <input
              className={campo}
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Notas (opcional)
            </label>
            <textarea
              className={campo}
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles de la venta..."
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-xl bg-white p-4 font-bold text-black disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar ingreso"}
          </button>
        </form>
      </div>
    </main>
  );
}
