
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("servicios_reserva")
      .select("id, nombre, precio, duracion_minutos")
      .eq("activo", true)
      .not("precio", "is", null)
      .order("nombre");

    if (error) {
      console.error(
        "Error al consultar servicios:",
        error.message
      );

      return NextResponse.json(
        { error: "No se pudieron cargar los servicios." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { servicios: data ?? [] },
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
