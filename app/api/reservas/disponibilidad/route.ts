
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { connection } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  await connection();

  try {
    const { searchParams } = new URL(request.url);

    const fecha = searchParams.get("fecha");
    const servicioId = searchParams.get("servicio_id");

    if (
      !fecha ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      !servicioId ||
      !UUID_REGEX.test(servicioId)
    ) {
      return NextResponse.json(
        { error: "Fecha o servicio inválido." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc(
      "horas_disponibles_reserva",
      {
        p_fecha: fecha,
        p_servicio_id: servicioId,
      }
    );

    if (error) {
      console.error(
        "Error consultando disponibilidad:",
        error.message
      );

      return NextResponse.json(
        {
          error: "No se pudieron consultar los horarios.",
        },
        { status: 500 }
      );
    }

    const horarios = (data ?? []).map(
      (item: { hora: string }) => item.hora
    );

    return NextResponse.json(
      { fecha, horarios },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error interno:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
