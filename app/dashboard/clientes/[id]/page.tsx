"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  temas_conversacion: string | null;
  corte_actual: string | null;
  precio: number | null;
  frecuencia: string | null;
  ultima_visita: string | null;
};

type Ingreso = {
  id: string;
  nombre_cliente: string;
  precio: number;
  servicio: string;
  fecha: string;
};

export default function ClientePage() {
const params = useParams<{ id: string }>();
const clienteId = params.id;

  const supabase = createClient();

  const [cliente, setCliente] =
    useState<Cliente | null>(null);

  const [historial, setHistorial] =
    useState<Ingreso[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    cargarCliente();
  }, [clienteId]);

  async function cargarCliente() {
    setLoading(true);

    const { data: clienteData, error: clienteError } =
      await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId)
        .single();

    if (clienteError) {
      console.error(clienteError);
      setLoading(false);
      return;
    }

    const { data: historialData, error: historialError } =
      await supabase
        .from("ingresos")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("fecha", {
          ascending: false,
        });

    if (historialError) {
      console.error(historialError);
    }

    setCliente(clienteData);
    setHistorial(historialData || []);

    setLoading(false);
  }

  function formatearFecha(
    fecha: string | null
  ) {
    if (!fecha) {
      return "No registrada";
    }

    return new Date(
      fecha
    ).toLocaleDateString("es-PR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-500">
            Cargando cliente...
          </div>

        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">

          <Link
            href="/dashboard/clientes"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Volver a clientes
          </Link>

          <div className="mt-8 rounded-3xl border border-red-900 bg-red-950/20 p-10 text-center">

            <h1 className="text-2xl font-bold">
              Cliente no encontrado
            </h1>

            <p className="mt-2 text-zinc-500">
              No pudimos encontrar este cliente.
            </p>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">

      <div className="mx-auto max-w-5xl">

        {/* VOLVER */}
        <Link
          href="/dashboard/clientes"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Volver a clientes
        </Link>

        {/* HEADER */}
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

  <div>
    <h1 className="text-4xl font-bold">
      {cliente.nombre}
    </h1>

    <p className="mt-2 text-zinc-400">
      Perfil del cliente
    </p>
  </div>

  <div className="flex items-center gap-3">

    <Link
      href={`/dashboard/clientes/${cliente.id}/editar`}
      className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
    >
      ✏️ Editar
    </Link>

    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4">
      <p className="text-xs uppercase tracking-wider text-zinc-500">
        Visitas
      </p>

      <p className="mt-1 text-2xl font-bold">
        {historial.length}
      </p>
    </div>

  </div>

</div>

        {/* INFORMACIÓN */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">

          {/* INFORMACIÓN PERSONAL */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

            <h2 className="text-xl font-bold">
              Información
            </h2>

            <div className="mt-6 space-y-5">

              <div>
                <p className="text-sm text-zinc-500">
                  📱 Teléfono
                </p>

                <p className="mt-1">
                  {cliente.telefono ||
                    "No registrado"}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  💬 Le gusta hablar de
                </p>

                <p className="mt-1">
                  {cliente.temas_conversacion ||
                    "No registrado"}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  🔄 Frecuencia
                </p>

                <p className="mt-1">
                  {cliente.frecuencia ||
                    "No registrada"}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  📅 Última visita
                </p>

                <p className="mt-1">
                  {formatearFecha(
                    cliente.ultima_visita
                  )}
                </p>
              </div>

            </div>

          </div>

          {/* CORTE */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

            <h2 className="text-xl font-bold">
              Corte actual
            </h2>

            <div className="mt-6 space-y-5">

              <div>
                <p className="text-sm text-zinc-500">
                  💈 Qué se hace
                </p>

                <p className="mt-1">
                  {cliente.corte_actual ||
                    "No registrado"}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  💵 Precio habitual
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {cliente.precio !== null
                    ? `$${cliente.precio.toFixed(
                        2
                      )}`
                    : "No registrado"}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* HISTORIAL */}
        <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

          <h2 className="text-xl font-bold">
            Historial de cortes
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Todas las visitas registradas
          </p>

          {historial.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 p-8 text-center">

              <div className="text-4xl">
                ✂️
              </div>

              <p className="mt-3 text-zinc-500">
                Todavía no hay cortes registrados
                para este cliente.
              </p>

            </div>
          ) : (
            <div className="mt-6 space-y-3">

              {historial.map((ingreso) => (
                <div
                  key={ingreso.id}
                  className="rounded-2xl border border-zinc-800 p-5"
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <p className="font-bold">
                        {ingreso.servicio}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {formatearFecha(
                          ingreso.fecha
                        )}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">

                      <p className="text-lg font-bold">
                        $
                        {Number(
                          ingreso.precio
                        ).toFixed(2)}
                      </p>

                      <p className="text-sm text-zinc-500">
                        Pagado
                      </p>

                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}