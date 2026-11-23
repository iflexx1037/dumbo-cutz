
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Variante = {
  id: string;
  talla: string | null;
  variacion: string | null;
  precio: number;
  cantidad: number;
  activo: boolean;
};

type Producto = {
  id: string;
  nombre: string;
  asicale_variantes: Variante[];
};

type Item = {
  variante_id: string;
  cantidad: number;
};

const campo =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none focus:border-zinc-500";

const dinero = (valor: number) =>
  valor.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function fechaLocal() {
  const hoy = new Date();
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");
}

function nombreVariante(v: Variante) {
  return [v.talla, v.variacion]
    .filter(Boolean)
    .join(" · ") || "Única";
}

export default function NuevaVentaAsicalePage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<Item[]>([]);
  const [productoId, setProductoId] = useState("");
  const [varianteId, setVarianteId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [fecha, setFecha] = useState("");
  const [metodoPago, setMetodoPago] = useState("ATH Móvil");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFecha(fechaLocal());

    let activo = true;

    async function cargar() {
      try {
        const supabase = createClient();

        const { data, error: consultaError } = await supabase
          .from("asicale_productos")
          .select(`
            id,
            nombre,
            asicale_variantes (
              id,
              talla,
              variacion,
              precio,
              cantidad,
              activo
            )
          `)
          .eq("activo", true)
          .order("nombre");

        if (consultaError) throw consultaError;
        if (!activo) return;

        const lista = (data || []) as Producto[];
        setProductos(lista);

        const primero = lista.find((p) =>
          p.asicale_variantes.some((v) => v.activo)
        );

        if (primero) {
          setProductoId(primero.id);
          setVarianteId(
            primero.asicale_variantes.find((v) => v.activo)
              ?.id || ""
          );
        }
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el inventario."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();

    return () => {
      activo = false;
    };
  }, []);

  const productoActual = productos.find(
    (p) => p.id === productoId
  );

  const variantesActuales =
    productoActual?.asicale_variantes.filter(
      (v) => v.activo
    ) || [];

  const varianteActual = variantesActuales.find(
    (v) => v.id === varianteId
  );

  const variantes = useMemo(() => {
    return productos.flatMap((p) =>
      p.asicale_variantes
        .filter((v) => v.activo)
        .map((v) => ({
          ...v,
          producto: p.nombre,
        }))
    );
  }, [productos]);

  const detalles = carrito.map((item) => ({
    ...item,
    variante: variantes.find(
      (v) => v.id === item.variante_id
    ),
  }));

  const total = detalles.reduce(
    (suma, item) =>
      suma +
      Number(item.variante?.precio || 0) * item.cantidad,
    0
  );

  const unidades = carrito.reduce(
    (suma, item) => suma + item.cantidad,
    0
  );

  const yaAgregadas = carrito.find(
    (item) => item.variante_id === varianteId
  )?.cantidad || 0;

  function seleccionarProducto(id: string) {
    setProductoId(id);
    setCantidad(1);

    const p = productos.find((item) => item.id === id);
    setVarianteId(
      p?.asicale_variantes.find((v) => v.activo)?.id || ""
    );
  }

  function agregarAlCarrito() {
    setError("");

    if (!varianteActual) {
      setError("Selecciona una variante.");
      return;
    }

    if (
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0 ||
      cantidad + yaAgregadas > varianteActual.cantidad
    ) {
      setError(
        "La cantidad supera las unidades disponibles."
      );
      return;
    }

    setCarrito((actuales) => {
      const existe = actuales.some(
        (item) => item.variante_id === varianteId
      );

      if (existe) {
        return actuales.map((item) =>
          item.variante_id === varianteId
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }

      return [
        ...actuales,
        { variante_id: varianteId, cantidad },
      ];
    });

    setCantidad(1);
  }

  function cambiarCantidad(id: string, nueva: number) {
    const variante = variantes.find((v) => v.id === id);
    if (!variante) return;

    if (nueva <= 0) {
      setCarrito((actuales) =>
        actuales.filter((item) => item.variante_id !== id)
      );
      return;
    }

    if (nueva > variante.cantidad) return;

    setCarrito((actuales) =>
      actuales.map((item) =>
        item.variante_id === id
          ? { ...item, cantidad: nueva }
          : item
      )
    );
  }

  async function guardarVenta() {
    if (guardando) return;
    setError("");

    if (carrito.length === 0) {
      setError("Añade al menos un artículo.");
      return;
    }

    if (!fecha) {
      setError("Selecciona la fecha de la venta.");
      return;
    }

    setGuardando(true);

    try {
      const supabase = createClient();

      const { error: guardarError } = await supabase.rpc(
        "asicale_registrar_venta",
        {
          p_articulos: carrito,
          p_fecha: fecha,
          p_metodo_pago: metodoPago,
          p_notas: notas.trim() || null,
        }
      );

      if (guardarError) throw guardarError;

      window.location.assign(
        "/dashboard/asicale/ingresos"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la venta."
      );
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/asicale"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Volver a Asicale Club
        </Link>

        <header className="mt-8">
          <p className="text-sm text-zinc-500">
            ASICALE CLUB / VENTAS
          </p>
          <h1 className="mt-3 text-4xl font-bold">
            🛒 Nueva venta
          </h1>
          <p className="mt-3 text-zinc-400">
            Añade varios artículos a una misma venta.
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400"
          >
            {error}
          </p>
        )}

        <section className="mt-8 space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-bold">
            Seleccionar artículos
          </h2>

          {cargando ? (
            <p className="text-zinc-400">
              Cargando productos...
            </p>
          ) : productos.length === 0 ? (
            <div className="space-y-3">
              <p className="text-zinc-400">
                Todavía no tienes productos registrados.
              </p>
              <Link
                href="/dashboard/asicale/inventario"
                className="inline-block text-white underline"
              >
                Crear productos
              </Link>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Producto
                </label>
                <select
                  className={campo}
                  value={productoId}
                  onChange={(e) =>
                    seleccionarProducto(e.target.value)
                  }
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Talla / Variación
                </label>
                <select
                  className={campo}
                  value={varianteId}
                  onChange={(e) => {
                    setVarianteId(e.target.value);
                    setCantidad(1);
                  }}
                >
                  {variantesActuales.map((v) => (
                    <option key={v.id} value={v.id}>
                      {nombreVariante(v)} —{" "}
                      {dinero(Number(v.precio))} —{" "}
                      {v.cantidad} disponibles
                    </option>
                  ))}
                </select>
              </div>

              {varianteActual && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black p-4">
                  <div>
                    <p className="text-sm text-zinc-400">
                      Precio unitario
                    </p>
                    <p className="text-xl font-bold">
                      {dinero(Number(varianteActual.precio))}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-zinc-400">
                      Disponibles
                    </p>
                    <p className="text-xl font-bold">
                      {Math.max(
                        0,
                        varianteActual.cantidad - yaAgregadas
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Cantidad a añadir
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={campo}
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(Number(e.target.value))
                  }
                />
              </div>

              <button
                type="button"
                disabled={
                  !varianteActual ||
                  varianteActual.cantidad <= yaAgregadas
                }
                onClick={agregarAlCarrito}
                className="w-full rounded-xl border border-zinc-600 bg-zinc-800 p-4 font-bold hover:bg-zinc-700 disabled:opacity-50"
              >
                + Añadir a la venta
              </button>
            </>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">
              Artículos de la venta
            </h2>
            <span className="text-sm text-zinc-400">
              {unidades} unidades
            </span>
          </div>

          {detalles.length === 0 ? (
            <p className="mt-6 text-zinc-400">
              Todavía no has añadido artículos.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {detalles.map((item) => (
                <div
                  key={item.variante_id}
                  className="rounded-2xl border border-zinc-800 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        {item.variante?.producto}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {item.variante
                          ? nombreVariante(item.variante)
                          : "Variante"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {dinero(
                          Number(item.variante?.precio || 0)
                        )}{" "}
                        por unidad
                      </p>
                    </div>

                    <p className="text-xl font-bold text-green-400">
                      {dinero(
                        Number(item.variante?.precio || 0) *
                          item.cantidad
                      )}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        cambiarCantidad(
                          item.variante_id,
                          item.cantidad - 1
                        )
                      }
                      className="rounded-lg border border-zinc-700 px-4 py-2"
                    >
                      −
                    </button>

                    <span className="font-bold">
                      {item.cantidad}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        cambiarCantidad(
                          item.variante_id,
                          item.cantidad + 1
                        )
                      }
                      className="rounded-lg border border-zinc-700 px-4 py-2"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        cambiarCantidad(item.variante_id, 0)
                      }
                      className="ml-auto text-sm text-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-bold">
            Detalles de la venta
          </h2>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Fecha
            </label>
            <input
              type="date"
              className={campo}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Método de pago
            </label>
            <select
              className={campo}
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="ATH Móvil">ATH Móvil</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">
                Transferencia
              </option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Especificaciones / Notas
            </label>
            <textarea
              className={campo}
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Cliente compró para regalo, venta en barbería, etc."
            />
          </div>
        </section>

        <div className="mt-8 rounded-3xl border border-zinc-700 bg-zinc-950 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">
                Total de la venta
              </p>
              <p className="mt-2 text-4xl font-bold text-green-400">
                {dinero(total)}
              </p>
            </div>

            <span className="text-sm text-zinc-400">
              {unidades} artículos
            </span>
          </div>

          <button
            type="button"
            disabled={
              guardando ||
              cargando ||
              carrito.length === 0 ||
              total <= 0
            }
            onClick={guardarVenta}
            className="mt-6 w-full rounded-xl bg-white p-4 font-bold text-black disabled:opacity-50"
          >
            {guardando
              ? "Registrando venta..."
              : "Confirmar y guardar venta"}
          </button>

          <p className="mt-3 text-center text-xs text-zinc-500">
            Al confirmar, se descontará el inventario y
            se registrará el ingreso.
          </p>
        </div>
      </div>
    </main>
  );
}
