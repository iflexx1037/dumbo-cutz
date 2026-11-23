
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Variante = {
  id: string;
  talla: string | null;
  variacion: string | null;
  precio: number;
  costo: number;
  cantidad: number;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  asicale_variantes: Variante[];
};

type Fila = {
  id: number;
  talla: string;
  variacion: string;
  precio: string;
  costo: string;
  cantidad: string;
};

const nuevaFila = (id: number): Fila => ({
  id,
  talla: "",
  variacion: "",
  precio: "",
  costo: "",
  cantidad: "0",
});

const campo =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white outline-none focus:border-zinc-500";

const dinero = (valor: number) =>
  Number(valor).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export default function InventarioAsicalePage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [filas, setFilas] = useState<Fila[]>([
    nuevaFila(1),
  ]);
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: consultaError } = await supabase
        .from("asicale_productos")
        .select(`
          id,
          nombre,
          descripcion,
          activo,
          asicale_variantes (
            id,
            talla,
            variacion,
            precio,
            costo,
            cantidad
          )
        `)
        .eq("activo", true)
        .order("creado_en", { ascending: false });

      if (consultaError) throw consultaError;

      setProductos((data || []) as Producto[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el inventario."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarProductos();
  }, [cargarProductos]);

  function actualizarFila(
    id: number,
    campoFila: keyof Omit<Fila, "id">,
    valor: string
  ) {
    setFilas((actuales) =>
      actuales.map((fila) =>
        fila.id === id
          ? { ...fila, [campoFila]: valor }
          : fila
      )
    );
  }

  function agregarVariante() {
    setFilas((actuales) => [
      ...actuales,
      nuevaFila(
        Math.max(0, ...actuales.map((f) => f.id)) + 1
      ),
    ]);
  }

  function eliminarVariante(id: number) {
    setFilas((actuales) =>
      actuales.length > 1
        ? actuales.filter((fila) => fila.id !== id)
        : actuales
    );
  }

  async function guardarProducto(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("Escribe el nombre del producto.");
      return;
    }

    const variantes = filas.map((fila) => ({
      talla: fila.talla.trim() || null,
      variacion: fila.variacion.trim() || null,
      precio: Number(fila.precio),
      costo: Number(fila.costo),
      cantidad: Number(fila.cantidad),
    }));

    const invalido = filas.some((fila, i) => {
      const variante = variantes[i];

      return (
        fila.precio.trim() === "" ||
        fila.costo.trim() === "" ||
        fila.cantidad.trim() === "" ||
        !Number.isFinite(variante.precio) ||
        !Number.isFinite(variante.costo) ||
        !Number.isSafeInteger(variante.cantidad) ||
        variante.precio < 0 ||
        variante.costo < 0 ||
        variante.cantidad < 0
      );
    });

    if (invalido) {
      setError(
        "Revisa precio, costo y cantidad de cada variante."
      );
      return;
    }

    const claves = variantes.map(
      (v) =>
        `${(v.talla || "").toLowerCase()}|${(
          v.variacion || ""
        ).toLowerCase()}`
    );

    if (new Set(claves).size !== claves.length) {
      setError(
        "No repitas la misma combinación de talla y variación."
      );
      return;
    }

    setGuardando(true);

    try {
      const supabase = createClient();

      const { error: guardarError } = await supabase.rpc(
        "asicale_crear_producto",
        {
          p_nombre: nombre.trim(),
          p_descripcion: descripcion.trim() || null,
          p_variantes: variantes,
        }
      );

      if (guardarError) throw guardarError;

      setNombre("");
      setDescripcion("");
      setFilas([nuevaFila(1)]);
      setMostrarFormulario(false);

      await cargarProductos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el producto."
      );
    } finally {
      setGuardando(false);
    }
  }

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalUnidades = productos.reduce(
    (total, p) =>
      total +
      p.asicale_variantes.reduce(
        (suma, v) => suma + Number(v.cantidad),
        0
      ),
    0
  );

  const inventarioBajo = productos.reduce(
    (total, p) =>
      total +
      p.asicale_variantes.filter(
        (v) => Number(v.cantidad) <= 5
      ).length,
    0
  );

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/asicale"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a Asicale Club
        </Link>

        <header className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">
              ASICALE CLUB / INVENTARIO
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              📦 Inventario
            </h1>

            <p className="mt-3 text-zinc-400">
              Control de productos, tallas y existencias.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setMostrarFormulario(!mostrarFormulario);
            }}
            className="rounded-xl bg-white px-6 py-3 font-bold text-black"
          >
            {mostrarFormulario
              ? "Cerrar formulario"
              : "+ Nuevo producto"}
          </button>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">
              Productos
            </p>
            <p className="mt-3 text-3xl font-bold">
              {productos.length}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">
              Unidades disponibles
            </p>
            <p className="mt-3 text-3xl font-bold">
              {totalUnidades}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">
              Variantes con poco inventario
            </p>
            <p className="mt-3 text-3xl font-bold text-yellow-400">
              {inventarioBajo}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              5 unidades o menos
            </p>
          </div>
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={guardarProducto}
            className="mt-8 space-y-6 rounded-3xl border border-zinc-700 bg-zinc-950 p-6"
          >
            <h2 className="text-2xl font-bold">
              Crear producto
            </h2>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Nombre del producto
              </label>
              <input
                className={campo}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Camisas Asicale Club"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Descripción (opcional)
              </label>
              <textarea
                className={campo}
                rows={2}
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(e.target.value)
                }
                placeholder="Ej. Nuevo drop de noviembre"
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">
                    Tallas y variaciones
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Deja la talla vacía si no aplica.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={agregarVariante}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                >
                  + Añadir variante
                </button>
              </div>

              {filas.map((fila, indice) => (
                <div
                  key={fila.id}
                  className="rounded-2xl border border-zinc-800 bg-black p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-semibold">
                      Variante {indice + 1}
                    </h4>

                    {filas.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          eliminarVariante(fila.id)
                        }
                        className="text-sm text-red-400"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">
                        Talla (opcional)
                      </label>
                      <input
                        className={campo}
                        value={fila.talla}
                        onChange={(e) =>
                          actualizarFila(
                            fila.id,
                            "talla",
                            e.target.value
                          )
                        }
                        placeholder="Small, Medium, Large..."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">
                        Variación (opcional)
                      </label>
                      <input
                        className={campo}
                        value={fila.variacion}
                        onChange={(e) =>
                          actualizarFila(
                            fila.id,
                            "variacion",
                            e.target.value
                          )
                        }
                        placeholder="Negro, blanco, diseño..."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">
                        Precio de venta ($)
                      </label>
                      <input
                        className={campo}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={fila.precio}
                        onChange={(e) =>
                          actualizarFila(
                            fila.id,
                            "precio",
                            e.target.value
                          )
                        }
                        placeholder="45.00"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">
                        Costo por unidad ($)
                      </label>
                      <input
                        className={campo}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={fila.costo}
                        onChange={(e) =>
                          actualizarFila(
                            fila.id,
                            "costo",
                            e.target.value
                          )
                        }
                        placeholder="20.00"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">
                        Cantidad disponible
                      </label>
                      <input
                        className={campo}
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={fila.cantidad}
                        onChange={(e) =>
                          actualizarFila(
                            fila.id,
                            "cantidad",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
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
              {guardando
                ? "Guardando producto..."
                : "Guardar producto"}
            </button>
          </form>
        )}

        {!mostrarFormulario && error && (
          <p role="alert" className="mt-6 text-red-400">
            {error}
          </p>
        )}

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Productos registrados
            </h2>

            <button
              type="button"
              onClick={() => void cargarProductos()}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm"
            >
              ↻ Actualizar
            </button>
          </div>

          <input
            className={`${campo} mt-5`}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
          />

          {cargando ? (
            <p className="mt-8 text-zinc-400">
              Cargando inventario...
            </p>
          ) : productosFiltrados.length === 0 ? (
            <p className="mt-8 text-zinc-400">
              No hay productos para mostrar.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              {productosFiltrados.map((producto) => (
                <div
                  key={producto.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <h3 className="text-xl font-bold">
                    {producto.nombre}
                  </h3>

                  {producto.descripcion && (
                    <p className="mt-2 text-sm text-zinc-400">
                      {producto.descripcion}
                    </p>
                  )}

                  <div className="mt-5 space-y-3">
                    {producto.asicale_variantes.map(
                      (variante) => (
                        <div
                          key={variante.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 p-4"
                        >
                          <div>
                            <p className="font-semibold">
                              {[
                                variante.talla,
                                variante.variacion,
                              ]
                                .filter(Boolean)
                                .join(" · ") ||
                                "Única"}
                            </p>

                            <p className="mt-1 text-sm text-zinc-400">
                              Precio:{" "}
                              {dinero(variante.precio)}
                            </p>

                            <p className="text-xs text-zinc-500">
                              Costo:{" "}
                              {dinero(variante.costo)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p
                              className={`text-xl font-bold ${
                                variante.cantidad <= 5
                                  ? "text-yellow-400"
                                  : "text-green-400"
                              }`}
                            >
                              {variante.cantidad} uds.
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              Disponibles
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}