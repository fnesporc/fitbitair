import { NextResponse } from "next/server";
import { healthFetch } from "../../../lib/google-health";

export const dynamic = "force-dynamic";

// Google Health API: i dati si leggono come "dataPoints" per ogni dataType.
// Base: GET /users/me/dataTypes/{tipo}/dataPoints
// I nomi esatti dei dataType e la forma della risposta li rifiniamo
// sulla documentazione quando colleghi e vediamo il JSON reale.
export async function GET() {
  try {
    const activity = await healthFetch(
      "/users/me/dataTypes/exercise/dataPoints"
    );

    // Per ora restituiamo il JSON grezzo: così, al primo collegamento,
    // vediamo com'è fatto davvero e poi mappiamo i campi che ti servono.
    return NextResponse.json({ raw: activity });
  } catch (e) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 });
  }
}
