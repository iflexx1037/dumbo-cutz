
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // RUTAS PÚBLICAS

  const rutasPublicas = [
    "/reservar",
    "/api/reservas",
    "/api/reservas/servicios",
    "/api/reservas/disponibilidad",
  ];

  if (rutasPublicas.includes(pathname)) {
    return supabaseResponse;
  }

  // VERIFICAR CONFIGURACIÓN

  const adminId = process.env.ADMIN_USER_ID;

  if (!hasEnvVars || !adminId) {
    return NextResponse.json(
      {
        error: "Configuración del servidor no disponible.",
      },
      { status: 503 }
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options
            )
          );
        },
      },
    }
  );

  // VERIFICAR SESIÓN

  const { data, error } =
    await supabase.auth.getClaims();

  const usuarioId = error
    ? undefined
    : data?.claims?.sub;

  const esAdministrador =
    usuarioId === adminId;

  const esRutaAuth =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/");

  const esAPI =
    pathname === "/api" ||
    pathname.startsWith("/api/");

  function conservarCookies(
    respuesta: NextResponse
  ) {
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => {
        respuesta.cookies.set(cookie);
      });

    return respuesta;
  }

  // PERMITIR INICIO DE SESIÓN

  if (esRutaAuth || pathname === "/") {
    return supabaseResponse;
  }

  // PROTEGER TODAS LAS RUTAS PRIVADAS

  if (!esAdministrador) {
    if (esAPI) {
      return conservarCookies(
        NextResponse.json(
          {
            error: usuarioId
              ? "Acceso no autorizado."
              : "Debes iniciar sesión.",
          },
          {
            status: usuarioId ? 403 : 401,
            headers: {
              "Cache-Control": "no-store",
            },
          }
        )
      );
    }

    if (usuarioId) {
      return conservarCookies(
        new NextResponse(
          "Acceso no autorizado.",
          { status: 403 }
        )
      );
    }

    const url = request.nextUrl.clone();

    url.pathname = "/auth/login";
    url.search = "";

    return conservarCookies(
      NextResponse.redirect(url)
    );
  }

  return supabaseResponse;
}
