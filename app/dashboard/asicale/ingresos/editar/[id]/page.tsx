
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const opciones = [
  "Camisas", "Hoodies", "Medias",
  "Accesorios", "Eventos", "Otros"
];

function EditarContenido() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const supabase = createClient();
      const { data, error: consultaError } = await supabase
        .from("ingresos_asicale")
        .select("*")
        .eq("id", id)
        .single();

      if (!activo) return;

      if (consultaError || !data) {
        setError("No se pudo cargar el ingreso.");
      } else {
        setDescripcion(data.descripcion);
        setCategoria(data.categoria);
        setMonto(String(data.monto));
        setFecha(data.fecha.slice(0, 10));
        setNotas(data.notas || "");
      }
      setCargando(false);
    }

    cargar();
    return () => { activo = false; };
  }, [id]);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cantidad = Number(monto);
    if (!descripcion.trim() || !categoria || !fecha ||
        !monto.trim() || !Number.isFinite(cantidad) ||
        cantidad <= 0) {
      setError("Completa los campos correctamente.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();

    const { data, error: guardarError } = await supabase
      .from("ingresos_asicale")
      .update({
        descripcion: descripcion.trim(),
        categoria,
        monto: cantidad,
        fecha,
        notas: notas.trim() || null,
      })
      .eq("id", id)
      .select("id")
      .single();

    if (guardarError || !data) {
      setError(
        guardarError?.message || "No se pudo actualizar el ingreso."
      );
      setGuardando(false);
      return;
    }

    router.push("/dashboard/asicale/ingresos");
    router.refresh();
  }

  const campo =
    "w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none focus:border-zinc-500";

  if (cargando) {
    return <main className="min-h-screen bg-black p-10 text-white">
      Cargando ingreso...
    </main>;
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/asicale/ingresos"
          className="text-sm text-zinc-400"
        >
          ← Volver a Ingresos
        </Link>

        <h1 className="mt-8 text-4xl font-bold">
          ✏️ Editar ingreso
        </h1>

        {error && (
          <p role="alert" className="mt-5 text-red-400">
            {error}
          </p>
        )}

        <form
          onSubmit={guardar}
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
              {!opciones.includes(categoria) && categoria && (
                <option value={categoria}>{categoria}</option>
              )}
              {opciones.map((opcion) => (
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
            disabled={guardando || cargando}
            className="w-full rounded-xl bg-white p-4 font-bold text-black disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function EditarIngresoAsicalePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-black p-10 text-white">
        Cargando...
      </main>
    }>
      <EditarContenido />
    </Suspense>
  );
}
