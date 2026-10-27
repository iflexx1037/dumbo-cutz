
"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const areas = {
  asicale: "Asicale Club",
  personales: "Personales",
  barberia: "Barbería",
};

const opciones = {
  asicale: [
    "Producción",
    "Inventario",
    "Envíos",
    "Publicidad",
    "Eventos",
    "Otros",
  ],
  personales: [
    "Comida",
    "Gasolina",
    "Compras",
    "Entretenimiento",
    "Otros",
  ],
  barberia: [
    "Herramientas",
    "Productos",
    "Mantenimiento",
    "Educación",
    "Otros",
  ],
};

type Area = keyof typeof areas;

function NuevoGastoContenido() {
  const params = useParams();
  const router = useRouter();
  const area = params.categoria as string;

  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  if (!(area in areas)) {
    return <main className="min-h-screen bg-black p-8 text-white">
      Categoría no encontrada.
    </main>;
  }

  const areaValida = area as Area;

  async function guardarGasto(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cantidad = Number(monto);

    if (!descripcion.trim() || !categoria || !fecha ||
        !Number.isFinite(cantidad) || cantidad <= 0) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    setGuardando(true);

    const supabase = createClient();

    const { error: errorSupabase } = await supabase
      .from("gastos")
      .insert({
        area: areaValida,
        descripcion: descripcion.trim(),
        categoria,
        monto: cantidad,
        fecha,
        notas: notas.trim() || null,
      });

    if (errorSupabase) {
      console.error(errorSupabase);
      setError("No se pudo guardar el gasto: " + errorSupabase.message);
      setGuardando(false);
      return;
    }

    router.push(`/dashboard/gastos/${areaValida}`);
    router.refresh();
  }

  const campo =
    "w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none focus:border-zinc-500";

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/dashboard/gastos/${areaValida}`}
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a gastos
        </Link>

        <h1 className="mt-8 text-4xl font-bold">
          Nuevo gasto
        </h1>

        <p className="mt-2 text-zinc-400">
          {areas[areaValida]}
        </p>

        <form onSubmit={guardarGasto}
          className="mt-8 space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Descripción *
            </label>
            <input
              className={campo}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Compra de materiales"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Categoría *
            </label>
            <select
              className={campo}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
            >
              <option value="">Seleccionar categoría</option>
              {opciones[areaValida].map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Cantidad ($) *
            </label>
            <input
              className={campo}
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Fecha *
            </label>
            <input
              className={campo}
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Notas (opcional)
            </label>
            <textarea
              className={campo}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales..."
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
            className="w-full rounded-xl bg-white p-4 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar gasto"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NuevoGastoPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-black p-10 text-white">
        Cargando formulario...
      </main>
    }>
      <NuevoGastoContenido />
    </Suspense>
  );
}
