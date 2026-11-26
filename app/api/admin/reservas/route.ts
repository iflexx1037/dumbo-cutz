
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esAdministrador } from "@/lib/supabase/admin-auth";

function respuestaError(
  mensaje: string,
  status = 400
) {
  return NextResponse.json(
    { error: mensaje },
    { status }
  );
}

export async function GET() {
  try {
    if (!(await esAdministrador())) {
      return respuestaError("Acceso no autorizado.", 403);
    }

    const supabase = createAdminClient();


const [
  configuracion,
  horarios,
  servicios,
  bloqueados,
  bloques,
] = await Promise.all([
  supabase
    .from("configuracion_reservas")
    .select("*")
    .eq("id", 1)
    .single(),

  supabase
    .from("horarios_reserva")
    .select("*")
    .order("dia_semana"),

  supabase
    .from("servicios_reserva")
    .select("*")
    .order("nombre"),

  supabase
    .from("dias_bloqueados")
    .select("*")
    .order("fecha"),

  supabase
    .from("bloques_horarios_reserva")
    .select("*")
    .order("hora_inicio"),
]);

if (
  configuracion.error ||
  horarios.error ||
  servicios.error ||
  bloqueados.error ||
  bloques.error
) {
  return respuestaError(
    "No se pudo cargar la configuración.",
    500
  );
}

    return NextResponse.json(
      {
        configuracion: configuracion.data,
horarios: horarios.data.map((h) => ({
  ...h,
  bloques: bloques.data.filter(
    (b) => b.dia_semana === h.dia_semana
  ),
})),
        servicios: servicios.data,
        bloqueados: bloqueados.data,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {
    console.error(error);

    return respuestaError(
      "Error interno del servidor.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await esAdministrador())) {
      return respuestaError("Acceso no autorizado.", 403);
    }

    const origin = request.headers.get("origin");

    if (origin !== request.nextUrl.origin) {
      return respuestaError("Origen no autorizado.", 403);
    }

    const body = await request.json();

    if (!body || typeof body !== "object") {
      return respuestaError("Datos inválidos.");
    }

    const supabase = createAdminClient();

    const { accion } = body;

    // CONFIGURACIÓN GENERAL

    if (accion === "configuracion") {
      const anticipacion = body.anticipacion_minutos;

      if (
        !Number.isInteger(anticipacion) ||
        anticipacion < 0 ||
        anticipacion > 10080
      ) {
        return respuestaError(
          "Anticipación inválida."
        );
      }

      if (typeof body.reservas_activas !== "boolean") {
        return respuestaError("Estado inválido.");
      }

      // Impedir activación pública hasta completar seguridad.
      if (
        body.reservas_activas &&
        process.env.RESERVAS_LISTAS_PARA_PUBLICAR !== "true"
      ) {
        return respuestaError(
          "Todavía debemos completar las pruebas de seguridad."
        );
      }

      const { error } = await supabase
        .from("configuracion_reservas")
        .update({
          reservas_activas: body.reservas_activas,
          anticipacion_minutos: anticipacion,
        })
        .eq("id", 1);

      if (error) throw error;
    }

    // HORARIOS SEMANALES


else if (accion === "horarios") {
  const horarios = body.horarios;

  if (
    !Array.isArray(horarios) ||
    horarios.length !== 7
  ) {
    return respuestaError("Horarios inválidos.");
  }

  const regexHora =
    /^([01]\d|2[0-3]):[0-5]\d$/;

  const dias = new Set<number>();

  for (const h of horarios) {
    if (
      !h ||
      !Number.isInteger(h.dia_semana) ||
      h.dia_semana < 1 ||
      h.dia_semana > 7 ||
      dias.has(h.dia_semana) ||
      typeof h.activo !== "boolean" ||
      !Array.isArray(h.bloques) ||
      h.bloques.length > 24
    ) {
      return respuestaError("Día inválido.");
    }

    dias.add(h.dia_semana);

    if (h.activo && h.bloques.length === 0) {
      return respuestaError(
        "Añade al menos un bloque a cada día abierto."
      );
    }

    for (const b of h.bloques) {
      if (
        !b ||
        typeof b.hora_inicio !== "string" ||
        typeof b.hora_fin !== "string" ||
        !regexHora.test(b.hora_inicio) ||
        (
          !regexHora.test(b.hora_fin) &&
          b.hora_fin !== "24:00"
        ) ||
        b.hora_inicio >= b.hora_fin
      ) {
        return respuestaError(
          "Revisa las horas de apertura y cierre."
        );
      }
    }

    const ordenados = [...h.bloques].sort(
      (a, b) =>
        a.hora_inicio.localeCompare(b.hora_inicio)
    );

    for (let i = 1; i < ordenados.length; i++) {
      if (
        ordenados[i].hora_inicio <
        ordenados[i - 1].hora_fin
      ) {
        return respuestaError(
          "Los bloques de un mismo día no pueden superponerse."
        );
      }
    }
  }

  const { error } = await supabase.rpc(
    "guardar_bloques_horarios",
    { p_horarios: horarios }
  );

  if (error) throw error;
}

    // CREAR O EDITAR SERVICIO

    else if (accion === "guardar_servicio") {
      const nombre =
        typeof body.nombre === "string"
          ? body.nombre.trim()
          : "";

      const precio = body.precio;
      const duracion = body.duracion_minutos;

      if (
        nombre.length < 2 ||
        nombre.length > 100 ||
        typeof precio !== "number" ||
        !Number.isFinite(precio) ||
        precio < 0 ||
        precio > 10000 ||
        !Number.isInteger(duracion) ||
        duracion < 5 ||
        duracion > 720 ||
        typeof body.activo !== "boolean"
      ) {
        return respuestaError(
          "Revisa los datos del servicio."
        );
      }

      const servicio = {
        nombre,
        precio,
        duracion_minutos: duracion,
        activo: body.activo,
      };

      const resultado = body.id
        ? await supabase
            .from("servicios_reserva")
            .update(servicio)
            .eq("id", body.id)
        : await supabase
            .from("servicios_reserva")
            .insert(servicio);

      if (resultado.error) {
        if (resultado.error.code === "23505") {
          return respuestaError(
            "Ya existe un servicio con ese nombre."
          );
        }

        throw resultado.error;
      }
    }

    // DESACTIVAR SERVICIO

    else if (accion === "desactivar_servicio") {
      if (typeof body.id !== "string") {
        return respuestaError("Servicio inválido.");
      }

      const { error } = await supabase
        .from("servicios_reserva")
        .update({ activo: false })
        .eq("id", body.id);

      if (error) throw error;
    }

    // BLOQUEAR DÍA

    else if (accion === "bloquear_dia") {
      const fecha = body.fecha;

      const motivo =
        typeof body.motivo === "string"
          ? body.motivo.trim().slice(0, 200)
          : "";

      if (
        typeof fecha !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ) {
        return respuestaError("Fecha inválida.");
      }

      const { error } = await supabase
        .from("dias_bloqueados")
        .upsert(
          {
            fecha,
            motivo: motivo || null,
          },
          { onConflict: "fecha" }
        );

      if (error) throw error;
    }

    // DESBLOQUEAR DÍA

    else if (accion === "desbloquear_dia") {
      if (typeof body.id !== "string") {
        return respuestaError("Día inválido.");
      }

      const { error } = await supabase
        .from("dias_bloqueados")
        .delete()
        .eq("id", body.id);

      if (error) throw error;
    }

    else {
      return respuestaError("Acción inválida.");
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Cambios guardados correctamente.",
    });

  } catch (error) {
    console.error("Error administrativo:", error);

    return respuestaError(
      "No se pudieron guardar los cambios.",
      500
    );
  }
}
