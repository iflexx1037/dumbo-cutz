
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esAdministrador } from "@/lib/supabase/admin-auth";
import { createHmac } from "node:crypto";

function errorRespuesta(error: string, status = 400) {
  return NextResponse.json(
    { ok: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    if (!(await esAdministrador())) {
      return errorRespuesta("Acceso no autorizado.", 403);
    }

    const supabase = createAdminClient();

    const [citas, bloqueos, excepciones] =
      await Promise.all([
        supabase
          .from("citas")
          .select(`
            id,
            nombre_responsable,
            nombre_acompanante,
            telefono_reserva,
            fecha,
            hora,
            servicio,
            estado,
            ip_reserva_hash,
            dispositivo_reserva_hash
          `)
          .eq("origen", "online")
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("bloqueos_reservas")
          .select("id,tipo,motivo,activo,created_at")
          .eq("activo", true)
          .order("created_at", { ascending: false }),

        supabase
          .from("excepciones_reservas")
          .select("id,tipo,limite,motivo,activo,created_at")
          .eq("activo", true)
          .order("created_at", { ascending: false }),
      ]);

    if (citas.error || bloqueos.error || excepciones.error) {
      return errorRespuesta(
        "No se pudo cargar la información de seguridad.",
        500
      );
    }

    const actividad = (citas.data ?? []).map((c) => ({
      id: c.id,
      nombre_responsable: c.nombre_responsable,
      nombre_acompanante: c.nombre_acompanante,
      telefono_reserva: c.telefono_reserva,
      fecha: c.fecha,
      hora: c.hora,
      servicio: c.servicio,
      estado: c.estado,
      tiene_ip: Boolean(c.ip_reserva_hash),
      tiene_dispositivo: Boolean(c.dispositivo_reserva_hash),
    }));

    return NextResponse.json(
      {
        ok: true,
        actividad,
        bloqueos: bloqueos.data ?? [],
        excepciones: excepciones.data ?? [],
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    return errorRespuesta("Error interno del servidor.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await esAdministrador())) {
      return errorRespuesta("Acceso no autorizado.", 403);
    }

    if (
      request.headers.get("origin") !==
      request.nextUrl.origin
    ) {
      return errorRespuesta("Origen no autorizado.", 403);
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorRespuesta("Datos inválidos.");
    }

    const supabase = createAdminClient();

    const accion = body.accion;
    const tipo = body.tipo;

    const motivo =
      typeof body.motivo === "string"
        ? body.motivo.trim().slice(0, 200)
        : "";

    if (
      accion === "desbloquear" ||
      accion === "eliminar_excepcion"
    ) {
      if (
        typeof body.id !== "string" ||
        !uuidRegex.test(body.id)
      ) {
        return errorRespuesta("Identificador inválido.");
      }

      const tabla =
        accion === "desbloquear"
          ? "bloqueos_reservas"
          : "excepciones_reservas";

      const { error } = await supabase
        .from(tabla)
        .update({ activo: false })
        .eq("id", body.id);

      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    if (
      accion !== "bloquear" &&
      accion !== "crear_excepcion"
    ) {
      return errorRespuesta("Acción inválida.");
    }

    if (!["telefono", "ip", "dispositivo"].includes(tipo)) {
      return errorRespuesta("Tipo de protección inválido.");
    }

    if (accion === "crear_excepcion" && tipo === "telefono") {
      return errorRespuesta(
        "El límite por teléfono no admite excepciones."
      );
    }

    let identificador = "";
    let referencia = "";

    const secret = process.env.RESERVAS_RATE_LIMIT_SECRET;

    if (!secret) {
      return errorRespuesta(
        "Configuración de seguridad no disponible.",
        503
      );
    }

    // Bloqueo directo por teléfono.

    if (
      accion === "bloquear" &&
      tipo === "telefono" &&
      typeof body.telefono === "string"
    ) {
      const telefono = body.telefono
        .replace(/\D/g, "")
        .replace(/^1(?=\d{10}$)/, "");

      if (telefono.length !== 10) {
        return errorRespuesta("Teléfono inválido.");
      }

      identificador = createHmac("sha256", secret)
        .update(`telefono:${telefono}`)
        .digest("hex");

      referencia = telefono;
    } else {
      // Identificar al cliente desde una cita existente.

      if (
        typeof body.cita_id !== "string" ||
        !uuidRegex.test(body.cita_id)
      ) {
        return errorRespuesta("Selecciona una reserva.");
      }

      const { data: cita, error } = await supabase
        .from("citas")
        .select(`
          nombre_responsable,
          telefono_reserva,
          ip_reserva_hash,
          dispositivo_reserva_hash
        `)
        .eq("id", body.cita_id)
        .eq("origen", "online")
        .single();

      if (error || !cita) {
        return errorRespuesta("Reserva no encontrada.", 404);
      }

      referencia =
        cita.nombre_responsable ||
        cita.telefono_reserva ||
        "Reserva online";

      if (tipo === "ip") {
        identificador = cita.ip_reserva_hash || "";
      }

      if (tipo === "dispositivo") {
        identificador = cita.dispositivo_reserva_hash || "";
      }

      if (tipo === "telefono") {
        const telefono = (cita.telefono_reserva || "")
          .replace(/\D/g, "")
          .replace(/^1(?=\d{10}$)/, "");

        if (telefono.length !== 10) {
          return errorRespuesta("Teléfono no disponible.");
        }

        identificador = createHmac("sha256", secret)
          .update(`telefono:${telefono}`)
          .digest("hex");
      }
    }

    if (!/^[0-9a-f]{64}$/.test(identificador)) {
      return errorRespuesta(
        "Esta reserva no tiene ese identificador de seguridad."
      );
    }

    const descripcion = (
      motivo
        ? `${referencia} — ${motivo}`
        : referencia
    ).slice(0, 200);

    if (accion === "bloquear") {
      const { error } = await supabase
        .from("bloqueos_reservas")
        .upsert(
          {
            tipo,
            identificador,
            motivo: descripcion,
            activo: true,
          },
          { onConflict: "tipo,identificador" }
        );

      if (error) throw error;
    }

    if (accion === "crear_excepcion") {
      const limite = body.limite;

      if (
        !Number.isInteger(limite) ||
        limite < 3 ||
        limite > 20
      ) {
        return errorRespuesta("Límite inválido.");
      }

      const { error } = await supabase
        .from("excepciones_reservas")
        .upsert(
          {
            tipo,
            identificador,
            limite,
            motivo: descripcion,
            activo: true,
          },
          { onConflict: "tipo,identificador" }
        );

      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Cambios guardados correctamente.",
    });

  } catch {
    return errorRespuesta(
      "No se pudieron guardar los cambios.",
      500
    );
  }
}
