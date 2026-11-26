
import { NextRequest, NextResponse } from "next/server";
import { getContext } from "@netlify/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { isIP } from "node:net";

const COOKIE_NOMBRE = "dumbo_reservas_dispositivo";

function hash(
  tipo: string,
  valor: string,
  secret: string
) {
  return createHmac("sha256", secret)
    .update(`${tipo}:${valor}`)
    .digest("hex");
}

function obtenerIP(request: NextRequest): string | null {
  // NETLIFY
  try {
    const contexto = getContext();
    const ip = contexto?.ip?.trim();

    if (ip && isIP(ip)) {
      return ip;
    }
  } catch {
    // No hay contexto de Netlify.
  }

  // VERCEL
  if (process.env.VERCEL === "1") {
    const ip = request.headers
      .get("x-vercel-forwarded-for")
      ?.split(",")[0]
      ?.trim();

    return ip && isIP(ip) ? ip : null;
  }

  // DESARROLLO LOCAL
  if (process.env.NODE_ENV === "development") {
    return "127.0.0.1";
  }

  // BLOQUEAR SI NO SE PUEDE VERIFICAR LA IP
  return null;
}

function obtenerDispositivo(
  request: NextRequest,
  secret: string
) {
  const cookie = request.cookies.get(
    COOKIE_NOMBRE
  )?.value;

  if (cookie) {
    const partes = cookie.split(".");

    if (partes.length === 2) {
      const [id, firma] = partes;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (
        uuidRegex.test(id) &&
        /^[0-9a-f]{64}$/.test(firma)
      ) {
        const esperada = hash(
          "cookie",
          id,
          secret
        );

        if (
          timingSafeEqual(
            Buffer.from(firma, "hex"),
            Buffer.from(esperada, "hex")
          )
        ) {
          return {
            id,
            valor: cookie,
          };
        }
      }
    }
  }

  const id = randomUUID();

  return {
    id,
    valor: `${id}.${hash("cookie", id, secret)}`,
  };
}

function guardarCookie(
  response: NextResponse,
  valor: string
) {
  response.cookies.set(
    COOKIE_NOMBRE,
    valor,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    }
  );

  return response;
}

export async function POST(request: NextRequest) {
  let cookieDispositivo = "";

  function responder(
    datos: Record<string, unknown>,
    status: number
  ) {
    const response = NextResponse.json(
      datos,
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          ...(status === 429
            ? { "Retry-After": "900" }
            : {}),
        },
      }
    );

    if (cookieDispositivo) {
      guardarCookie(
        response,
        cookieDispositivo
      );
    }

    return response;
  }

  function respuestaError(
    error: string,
    status = 400,
    codigo?: string
  ) {
    return responder(
      {
        ok: false,
        error,
        ...(codigo ? { codigo } : {}),
      },
      status
    );
  }

  try {
    // VARIABLES PRIVADAS

    const secretKey =
      process.env.TURNSTILE_SECRET_KEY;

    const rateLimitSecret =
      process.env.RESERVAS_RATE_LIMIT_SECRET;

    const cookieSecret =
      process.env.RESERVAS_COOKIE_SECRET;

    const dominiosPermitidos = (
      process.env.TURNSTILE_ALLOWED_HOSTNAMES || ""
    )
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    if (
      !secretKey ||
      !rateLimitSecret ||
      !cookieSecret ||
      dominiosPermitidos.length === 0
    ) {
      console.error(
        "Faltan variables de seguridad."
      );

      return respuestaError(
        "Reservas temporalmente no disponibles.",
        503
      );
    }

    // IDENTIFICAR CONEXIÓN Y NAVEGADOR

    const ip = obtenerIP(request);

    if (!ip) {
      return respuestaError(
        "No se pudo verificar la conexión.",
        503
      );
    }

    const dispositivo = obtenerDispositivo(
      request,
      cookieSecret
    );

    cookieDispositivo = dispositivo.valor;

    const ipHash = hash(
      "ip",
      ip,
      rateLimitSecret
    );

    const dispositivoHash = hash(
      "dispositivo",
      dispositivo.id,
      rateLimitSecret
    );

    // VALIDAR SOLICITUD

    const texto = await request.text();

    if (Buffer.byteLength(texto, "utf8") > 10000) {
      return respuestaError(
        "Solicitud demasiado grande.",
        413
      );
    }

    let body;

    try {
      body = JSON.parse(texto);
    } catch {
      return respuestaError("Datos inválidos.");
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return respuestaError("Datos inválidos.");
    }

    const limpiar = (valor: unknown) =>
      typeof valor === "string"
        ? valor.trim()
        : "";

    const nombre = limpiar(body.nombre);

    const telefono = limpiar(body.telefono)
      .replace(/\D/g, "")
      .replace(/^1(?=\d{10}$)/, "");

    const servicioId = limpiar(body.servicioId);
    const fecha = limpiar(body.fecha);
    const hora = limpiar(body.hora);

    const turnstileToken = limpiar(
      body.turnstileToken
    );

    const nombreAcompanante = limpiar(
      body.nombreAcompanante
    );

    const relacionAcompanante = limpiar(
      body.relacionAcompanante
    ).toLowerCase();

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

    const horaRegex =
      /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      nombre.length < 2 ||
      nombre.length > 100 ||
      telefono.length !== 10 ||
      !uuidRegex.test(servicioId) ||
      !fechaRegex.test(fecha) ||
      !horaRegex.test(hora)
    ) {
      return respuestaError(
        "Verifica los datos de tu cita."
      );
    }

    const fechaValidada = new Date(
      `${fecha}T12:00:00Z`
    );

    if (
      !Number.isFinite(fechaValidada.getTime()) ||
      fechaValidada.toISOString().slice(0, 10) !== fecha
    ) {
      return respuestaError("Fecha inválida.");
    }

    const relacionesPermitidas = [
      "familiar",
      "amigo",
      "acompanante",
      "otro",
    ];

    if (
      nombreAcompanante.length > 100 ||
      (
        relacionAcompanante &&
        !relacionesPermitidas.includes(
          relacionAcompanante
        )
      )
    ) {
      return respuestaError(
        "Verifica los datos del acompañante."
      );
    }

    if (
      !turnstileToken ||
      turnstileToken.length > 2048
    ) {
      return respuestaError(
        "Completa la verificación de seguridad."
      );
    }

    const telefonoHash = hash(
      "telefono",
      telefono,
      rateLimitSecret
    );

    const supabase = createAdminClient();

    // LÍMITE DE INTENTOS POR IP

    const limiteIP = await supabase.rpc(
      "verificar_limite_reserva",
      {
        p_clave: `ip:${ipHash}`,
        p_limite: 10,
        p_minutos: 15,
      }
    );

    if (limiteIP.error) {
      return respuestaError(
        "Servicio temporalmente no disponible.",
        503
      );
    }

    if (limiteIP.data !== true) {
      return respuestaError(
        "Demasiados intentos. Espera 15 minutos.",
        429,
        "LIMITE_SOLICITUDES"
      );
    }

    // VERIFICAR TURNSTILE

    const verificacion = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: turnstileToken,
          remoteip: ip,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!verificacion.ok) {
      return respuestaError(
        "No se pudo verificar la solicitud.",
        503
      );
    }

    const resultado = await verificacion.json();

    if (resultado.success !== true) {
      return respuestaError(
        "La verificación expiró. Intenta nuevamente.",
        403,
        "TURNSTILE_INVALIDO"
      );
    }

    const hostname =
      typeof resultado.hostname === "string"
        ? resultado.hostname.toLowerCase()
        : "";

    if (!dominiosPermitidos.includes(hostname)) {
      return respuestaError(
        "No se pudo validar el origen de la reserva.",
        403,
        "DOMINIO_INVALIDO"
      );
    }

    // LÍMITE DE INTENTOS POR TELÉFONO

    const limiteTelefono = await supabase.rpc(
      "verificar_limite_reserva",
      {
        p_clave: `telefono:${telefonoHash}`,
        p_limite: 6,
        p_minutos: 15,
      }
    );

    if (limiteTelefono.error) {
      return respuestaError(
        "Servicio temporalmente no disponible.",
        503
      );
    }

    if (limiteTelefono.data !== true) {
      return respuestaError(
        "Demasiados intentos con este número. Espera 15 minutos.",
        429,
        "LIMITE_SOLICITUDES"
      );
    }

    // REGISTRAR CITA CON SEGURIDAD ADICIONAL

    const { data, error } = await supabase.rpc(
      "crear_reserva_publica",
      {
        p_nombre: nombre,
        p_telefono: telefono,
        p_servicio_id: servicioId,
        p_fecha: fecha,
        p_hora: hora,

        p_nombre_acompanante:
          nombreAcompanante || null,

        p_relacion_acompanante:
          relacionAcompanante || null,

        p_telefono_hash: telefonoHash,
        p_ip_hash: ipHash,
        p_dispositivo_hash: dispositivoHash,
      }
    );

    if (error) {
      console.error(
        "Error creando reserva:",
        error.code
      );

      if (
        error.message.includes("RESERVA_BLOQUEADA")
      ) {
        return respuestaError(
          "No puedes realizar reservas online. Comunícate directamente con tu barbero.",
          403,
          "RESERVA_BLOQUEADA"
        );
      }

      if (
        error.message.includes("LIMITE_IP") ||
        error.message.includes("LIMITE_DISPOSITIVO")
      ) {
        return respuestaError(
          "Ya se alcanzó el máximo de reservas activas desde esta conexión o navegador. Comunícate con tu barbero si necesitas otra cita.",
          409,
          "LIMITE_RESERVAS"
        );
      }

      if (
        error.message.includes(
          "ACOMPANANTE_REQUERIDO"
        )
      ) {
        return respuestaError(
          "Para realizar una segunda reserva, indica para quién es la cita.",
          409,
          "ACOMPANANTE_REQUERIDO"
        );
      }

      if (
        error.message.includes("LIMITE_RESERVAS")
      ) {
        return respuestaError(
          "Ya tienes dos citas activas asociadas a este número de teléfono.",
          409,
          "LIMITE_RESERVAS"
        );
      }

      if (
        error.message.includes(
          "RESERVAS_DESACTIVADAS"
        )
      ) {
        return respuestaError(
          "Las reservas online no están disponibles en este momento.",
          503,
          "RESERVAS_DESACTIVADAS"
        );
      }

      if (
        error.code === "23505" ||
        error.message.toLowerCase().includes("horario")
      ) {
        return respuestaError(
          "Este horario ya no está disponible. Selecciona otro.",
          409,
          "HORARIO_OCUPADO"
        );
      }

      return respuestaError(
        "No se pudo registrar la cita. Intenta nuevamente."
      );
    }

    if (!data) {
      return respuestaError(
        "No se recibió confirmación de la reserva.",
        500
      );
    }

    return responder(
      {
        ok: true,
        reservaId: data,
        mensaje:
          "Tu cita fue reservada correctamente.",
      },
      201
    );

  } catch (error) {
    console.error(
      "Error interno de reservas:",
      error instanceof Error
        ? error.name
        : "Error desconocido"
    );

    return respuestaError(
      "Ocurrió un error al procesar tu reserva.",
      500
    );
  }
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json(
    {
      ok: true,
      mensaje:
        "API de reservas Dumbo Cutz funcionando.",
      version: "4.1",
      limiteReservas: 2,
      seguridadAdicional: true,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  const secret =
    process.env.RESERVAS_COOKIE_SECRET;

  if (secret) {
    const dispositivo = obtenerDispositivo(
      request,
      secret
    );

    guardarCookie(
      response,
      dispositivo.valor
    );
  }

  return response;
}
