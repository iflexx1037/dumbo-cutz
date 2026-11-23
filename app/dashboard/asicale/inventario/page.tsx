
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
  asicale_variantes: Variante[];
};

type Fila = {
  id: number;
  talla: string;
  variacion: string;
  cantidad: string;
  precio: string;
  costo: string;
};

const campo =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white outline-none focus:border-zinc-500";

function dinero(valor: number) {
  return Number(valor).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

const tallas: Record<string, string> = {
  xs: "XS",
  s: "Small",
  small: "Small",
  m: "Medium",
  medium: "Medium",
  l: "Large",
  large: "Large",
  xl: "XL",
  xlarge: "XL",
  xxl: "2XL",
  "2xl": "2XL",
  xxxl: "3XL",
  "3xl": "3XL",
};

function normalizarVariacion(texto: string) {
  const valor = texto.trim();

  const colores: Record<string, string> = {
    negro: "Negro",
    negra: "Negro",
    negros: "Negro",
    negras: "Negro",
    blanco: "Blanco",
    blanca: "Blanco",
    blancos: "Blanco",
    blancas: "Blanco",
    gris: "Gris",
    grises: "Gris",
    rojo: "Rojo",
    roja: "Rojo",
    rojos: "Rojo",
    rojas: "Rojo",
    azul: "Azul",
    azules: "Azul",
    verde: "Verde",
    verdes: "Verde",
    beige: "Beige",
  };

  return (
    colores[valor.toLowerCase()] ||
    valor.charAt(0).toUpperCase() + valor.slice(1)
  );
}

function interpretarInventario(texto: string) {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length < 2) {
    throw new Error(
      "Escribe el nombre del producto y al menos una línea de inventario."
    );
  }

  const nombre = lineas[0];
  const filas: Fila[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i];

    const resultado = linea.match(
      /^(.*?)\s+(\d+)\s*(?:uds?\.?|unidades?)?$/i
    );

    if (!resultado || !resultado[1].trim()) {
      throw new Error(
        `No pude interpretar la línea ${i + 1}: "${linea}". Usa el formato "XL negras 10".`
      );
    }

    const descripcion = resultado[1].trim();
    const cantidad = resultado[2];

    const partes = descripcion.split(/\s+/);
    const posibleTalla = partes[0].toLowerCase();
    const tieneTalla = Boolean(tallas[posibleTalla]);

    const talla = tieneTalla
      ? tallas[posibleTalla]
      : "";

    const variacion = tieneTalla
      ? partes.slice(1).join(" ")
      : descripcion;

    filas.push({
      id: i,
      talla,
      variacion: normalizarVariacion(variacion),
      cantidad,
      precio: "",
      costo: "",
    });
  }

  const claves = filas.map(
    (fila) =>
      `${fila.talla.toLowerCase()}|${fila.variacion.toLowerCase()}`
  );

  if (new Set(claves).size !== claves.length) {
    throw new Error(
      "Hay combinaciones de talla y variación repetidas. Corrige la lista."
    );
  }

  return { nombre, filas };
}

export default function InventarioAsicalePage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [texto, setTexto] = useState(
    "Camisas Barber\nXL negras 10\nLarge negras 10\nXL blancas 5\nLarge blancas 5"
  );

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [precioGeneral, setPrecioGeneral] = useState("");
  const [costoGeneral, setCostoGeneral] = useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const cargarProductos = useCallback(async () => {
    setCargando(true);

    try {
      const supabase = createClient();

      const { data, error: consultaError } = await supabase
        .from("asicale_productos")
        .select(`
          id,
          nombre,
          descripcion,
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

  function generarVariantes() {
    setError("");
    setMensaje("");

    try {
      const resultado = interpretarInventario(texto);

      setNombre(resultado.nombre);
      setFilas(
        resultado.filas.map((fila) => ({
          ...fila,
          precio: precioGeneral,
          costo: costoGeneral,
        }))
      );

      setMensaje(
        `Se generaron ${resultado.filas.length} variantes. Revisa las cantidades y los precios antes de guardar.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo interpretar el inventario."
      );
    }
  }

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

  function aplicarPrecios() {
    setFilas((actuales) =>
      actuales.map((fila) => ({
        ...fila,
        precio: precioGeneral,
        costo: costoGeneral,
      }))
    );
  }

  async function guardarProducto() {
    setError("");
    setMensaje("");

    if (!nombre.trim() || filas.length === 0) {
      setError("Primero genera las variantes.");
      return;
    }

    const invalido = filas.some(
      (fila) =>
        !fila.precio.trim() ||
        !fila.costo.trim() ||
        !fila.cantidad.trim() ||
        !Number.isFinite(Number(fila.precio)) ||
        !Number.isFinite(Number(fila.costo)) ||
        !Number.isSafeInteger(Number(fila.cantidad)) ||
        Number(fila.precio) < 0 ||
        Number(fila.costo) < 0 ||
        Number(fila.cantidad) < 0
    );

    if (invalido) {
      setError(
        "Completa correctamente los precios, costos y cantidades de todas las variantes."
      );
      return;
    }

    const claves = filas.map(
      (fila) =>
        `${fila.talla.trim().toLowerCase()}|${fila.variacion.trim().toLowerCase()}`
    );

    if (new Set(claves).size !== claves.length) {
      setError(
        "Hay variantes repetidas. Cada combinación debe ser única."
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
          p_variantes: filas.map((fila) => ({
            talla: fila.talla.trim() || null,
            variacion: fila.variacion.trim() || null,
            precio: Number(fila.precio),
            costo: Number(fila.costo),
            cantidad: Number(fila.cantidad),
          })),
        }
      );

      if (guardarError) throw guardarError;

      setNombre("");
      setDescripcion("");
      setFilas([]);
      setTexto("");
      setPrecioGeneral("");
      setCostoGeneral("");
      setMostrarFormulario(false);

      await cargarProductos();
      setMensaje("Producto guardado correctamente.");
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

  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalUnidades = productos.reduce(
    (suma, p) =>
      suma +
      p.asicale_variantes.reduce(
        (total, v) => total + Number(v.cantidad),
        0
      ),
    0
  );

  const inventarioBajo = productos.reduce(
    (suma, p) =>
      suma +
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
              Administra productos, tallas, colores y cantidades.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario);
              setError("");
              setMensaje("");
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
          <section className="mt-8 space-y-6 rounded-3xl border border-zinc-700 bg-zinc-950 p-6">
            <div>
              <h2 className="text-2xl font-bold">
                Crear producto automáticamente
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                Escribe el nombre en la primera línea.
                Después, una variante y su cantidad por línea.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Lista de inventario
              </label>

              <textarea
                className={`${campo} font-mono`}
                rows={7}
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setFilas([]);
                  setMensaje("");
                }}
                placeholder={
                  "Camisas Barber\nXL negras 10\nLarge negras 10\nXL blancas 5"
                }
              />

              <p className="mt-2 text-xs text-zinc-500">
                Ejemplo sin tallas: Medias Asicale,
                seguido de "Blancas 15" y "Negras 20".
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Precio de venta general ($)
                </label>

                <input
                  className={campo}
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioGeneral}
                  onChange={(e) =>
                    setPrecioGeneral(e.target.value)
                  }
                  placeholder="45.00"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Costo por unidad general ($)
                </label>

                <input
                  className={campo}
                  type="number"
                  min="0"
                  step="0.01"
                  value={costoGeneral}
                  onChange={(e) =>
                    setCostoGeneral(e.target.value)
                  }
                  placeholder="20.00"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={generarVariantes}
              className="w-full rounded-xl border border-zinc-600 bg-zinc-800 p-4 font-bold hover:bg-zinc-700"
            >
              ✨ Generar variantes automáticamente
            </button>

            {filas.length > 0 && (
              <div className="space-y-5">
                <div className="border-t border-zinc-800 pt-6">
                  <h3 className="text-2xl font-bold">
                    {nombre}
                  </h3>

                  <p className="mt-2 text-zinc-400">
                    {filas.length} variantes ·{" "}
                    {filas.reduce(
                      (s, f) => s + (Number(f.cantidad) || 0),
                      0
                    )}{" "}
                    unidades
                  </p>
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
                    placeholder="Ej. Drop de noviembre"
                  />
                </div>

                <button
                  type="button"
                  onClick={aplicarPrecios}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                >
                  Aplicar precio y costo general a todas
                </button>

                {filas.map((fila, indice) => (
                  <div
                    key={fila.id}
                    className="rounded-2xl border border-zinc-800 bg-black p-4"
                  >
                    <h4 className="mb-4 font-bold">
                      Variante {indice + 1}
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                          Talla
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
                          placeholder="Sin talla"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                          Variación
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
                          placeholder="Negro, blanco..."
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                          Cantidad
                        </label>
                        <input
                          className={campo}
                          type="number"
                          min="0"
                          step="1"
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

                      <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                          Precio ($)
                        </label>
                        <input
                          className={campo}
                          type="number"
                          min="0"
                          step="0.01"
                          value={fila.precio}
                          onChange={(e) =>
                            actualizarFila(
                              fila.id,
                              "precio",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm text-zinc-400">
                          Costo por unidad ($)
                        </label>
                        <input
                          className={campo}
                          type="number"
                          min="0"
                          step="0.01"
                          value={fila.costo}
                          onChange={(e) =>
                            actualizarFila(
                              fila.id,
                              "costo",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={guardando}
                  onClick={guardarProducto}
                  className="w-full rounded-xl bg-white p-4 font-bold text-black disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando producto..."
                    : "Guardar producto"}
                </button>
              </div>
            )}
          </section>
        )}

        {error && (
          <p role="alert" className="mt-5 text-red-400">
            {error}
          </p>
        )}

        {mensaje && (
          <p role="status" className="mt-5 text-green-400">
            {mensaje}
          </p>
        )}

        <section className="mt-10">
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
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {cargando ? (
            <p className="mt-8 text-zinc-400">
              Cargando inventario...
            </p>
          ) : filtrados.length === 0 ? (
            <p className="mt-8 text-zinc-400">
              No hay productos para mostrar.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              {filtrados.map((producto) => (
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
                                .join(" · ") || "Única"}
                            </p>

                            <p className="mt-1 text-sm text-zinc-400">
                              Precio: {dinero(variante.precio)}
                            </p>

                            <p className="text-xs text-zinc-500">
                              Costo: {dinero(variante.costo)}
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
