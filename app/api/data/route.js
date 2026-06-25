import { NextResponse } from "next/server";
import { healthFetch } from "../../../lib/google-health";

export const dynamic = "force-dynamic";

// Trasforma i secondi ISO ("148s") in numero.
function secs(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace("s", ""));
}

const ICONS = {
  WALKING: "🚶",
  RUNNING: "🏃",
  WEIGHTS: "🏋️",
  WORKOUT: "🏋️",
  STRENGTH_TRAINING: "🏋️",
};

export async function GET() {
  try {
    const res = await healthFetch("/users/me/dataTypes/exercise/dataPoints");
    const points = res.dataPoints ?? [];

    const activities = points
      .map((p) => {
        const e = p.exercise ?? {};
        const m = e.metricsSummary ?? {};
        return {
          type: e.displayName ?? e.exerciseType ?? "Attività",
          icon: ICONS[e.exerciseType] ?? "🏃",
          start: e.interval?.startTime ?? null,
          durationMin: Math.round(secs(e.activeDuration) / 60),
          calories: m.caloriesKcal ?? null,
          steps: m.steps ? Number(m.steps) : null,
          distanceKm: m.distanceMillimeters
            ? +(m.distanceMillimeters / 1_000_000).toFixed(2)
            : null,
          avgHr: m.averageHeartRateBeatsPerMinute
            ? Number(m.averageHeartRateBeatsPerMinute)
            : null,
        };
      })
      .sort((a, b) => new Date(b.start) - new Date(a.start));

    return NextResponse.json({ activities });
  } catch (e) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 });
  }
}
