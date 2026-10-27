
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categoriasPorArea = {
  asicale: ["Producción", "Inventario", "Envíos", "Publicidad", "Eventos", "Otros"],
  personales: ["Comida", "Gasolina", "Compras", "Entretenimiento", "Otros"],
  barberia: ["Herramientas", "Productos", "Mantenimiento", "Educación", "Otros"],
};

type Area = keyof typeof categoriasPorArea;

function EditarGastoContenido() {
  const params = useParams();
  const router = useRouter();

  const area = params.categoria as string;
  const gastoId = params.id as string;
  const areaValida = area in categoriasPorArea ? area as Area : null;

  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!areaValida || !gastoId) {
      setLoading(false);
      return;
    }

    let activo = true;

    async function cargarGasto() {
      const supabase = createClient();

      const { data, error: consultaError } = await supabase
        .from("gastos")
        .select("*")
        .eq("id", gastoId)
        .eq("area", areaValida!)
        .single();

      if (!activo) return;

      if (consultaError || !data) {
        setError("No se pudo encontrar el gasto.");
      } else {
        setDescripcion(data.descripcion || "");
        setCategoria(data.categoria || "");
        setMonto(String(data.monto));
        setFecha(data.fecha?.slice(0, 10) || "");
        setNotas(data.notas || "");
      }

      setLoading(false);
    }

    cargarGasto();

    return () => {
      activo = false;
    };
  }, [areaValida, gastoId]);

  async function guardarCambios(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!areaValida || error) return;

    const cantidad = Number(monto);

    if (!descripcion.trim() || !categoria || !fecha ||
        !Number.isFinite(cantidad) || cantidad <= 0) {
      setError("Completa correctamente los campos.");
      return;
    }

    setGuardando(true);

    const supabase = createClient();

    const { data, error: actualizarError } = await supabase
      .from("gastos")
      .update({
        descripcion: descripcion.trim(),
        categoria,
        monto: cantidad,
        fecha,
        notas: notas.trim() || null,
      })
      .eq("id", gastoId)
      .eq("area", areaValida)
      .select("id")
      .single();

    if (actualizarError || !data) {
      setError("No se pudo actualizar el gasto: " +
        (actualizarError?.message || "Registro no encontrado"));
      setGuardando(false);
      return;
    }

    router.push(`/dashboard/gastos/${areaValida}`);
    router.refresh();
  }

  const campo =
    "w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none focus:border-zinc-500";

  if (!areaValida) {
    return <main className="min-h-screen bg-black p-8 text-white">
      Categoría no encontrada.
    </main>;
  }

  if (loading) {
    return <main className="min-h-screen bg-black p-10 text-white">
      Cargando gasto...
    </main>;
  }

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
          Editar gasto
        </h1>

        <p className="mt-2 text-zinc-400">
          Modifica la información de este gasto.
        </p>

        {error && (
          <p role="alert" className="mt-5 text-red-400">
            {error}
          </p>
        )}

        <form
          onSubmit={guardarCambios}
          className="mt-8 space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Descripción
            </label>
            <input className={campo} required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Categoría
            </label>
            <select className={campo} required
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {!categoriasPorArea[areaValida].includes(categoria) &&
                categoria && (
                  <option value={categoria}>{categoria}</option>
                )}
              {categoriasPorArea[areaValida].map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Cantidad ($)
            </label>
            <input className={campo} type="number"
              min="0.01" step="0.01" required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Fecha
            </label>
            <input className={campo} type="date" required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Notas
            </label>
            <textarea className={campo} rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={guardando || Boolean(error)}
            className="w-full rounded-xl bg-white p-4 font-bold text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function EditarGastoPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-black p-10 text-white">
        Cargando editor...
      </main>
    }>
      <EditarGastoContenido />
    </Suspense>
  );
}
