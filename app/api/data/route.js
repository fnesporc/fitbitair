import { NextResponse } from "next/server";
import { fitbitFetch } from "../../../lib/fitbit";

export const dynamic = "force-dynamic";

// Endpoint che la pagina chiama per avere i dati. Qui scegli COSA leggere:
// più avanti aggiungeremo sonno, battito, peso, ecc.
export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [profile, activity] = await Promise.all([
      fitbitFetch("/1/user/-/profile.json"),
      fitbitFetch(`/1/user/-/activities/date/${today}.json`),
    ]);

    return NextResponse.json({
      name: profile.user?.fullName ?? profile.user?.displayName,
      steps: activity.summary?.steps ?? 0,
      caloriesOut: activity.summary?.caloriesOut ?? 0,
      distanceKm:
        activity.summary?.distances?.find((d) => d.activity === "total")
          ?.distance ?? 0,
      activeMinutes:
        (activity.summary?.fairlyActiveMinutes ?? 0) +
        (activity.summary?.veryActiveMinutes ?? 0),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 });
  }
}
