import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "../../../../lib/google-health";

export const dynamic = "force-dynamic";

// Manda l'utente alla pagina di autorizzazione di Fitbit.
export async function GET() {
  return NextResponse.redirect(buildAuthorizeUrl());
}
