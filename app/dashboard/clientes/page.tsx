"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  corte_actual: string | null;
  frecuencia: string | null;
  precio: number | null;
  ultima_visita: string | null;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando clientes:", error);
      setLoading(false);
      return;
    }

    setClientes(data || []);
    setLoading(false);
  }

  const clientesFiltrados = clientes.filter((cliente) =>
    cliente.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-white"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-3 text-4xl font-bold">
              Clientes
            </h1>

            <p className="mt-2 text-zinc-400">
              {clientes.length} clientes registrados
            </p>
          </div>

          <Link
            href="/dashboard/clientes/nuevo"
            className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
          >
            + Nuevo cliente
          </Link>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="🔎 Buscar cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500">
            Cargando clientes...
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <div className="mb-4 text-5xl">👥</div>

            <h2 className="text-xl font-bold">
              No hay clientes
            </h2>

            <p className="mt-2 text-zinc-500">
              Crea tu primer cliente para comenzar.
            </p>

            <Link
              href="/dashboard/clientes/nuevo"
              className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-bold text-black"
            >
              + Crear cliente
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {clientesFiltrados.map((cliente) => (
              <Link
                key={cliente.id}
                href={`/dashboard/clientes/${cliente.id}`}
                className="block rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">
                      {cliente.nombre}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      {cliente.frecuencia || "Frecuencia no registrada"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-zinc-400">
                      {cliente.corte_actual || "Sin corte registrado"}
                    </p>

                    {cliente.precio !== null && (
                      <p className="mt-1 font-semibold">
                        ${cliente.precio.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}