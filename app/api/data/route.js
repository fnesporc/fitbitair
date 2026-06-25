import { NextResponse } from "next/server";
import { healthFetch } from "../../../lib/google-health";

export const dynamic = "force-dynamic";

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
const CARDIO = new Set(["WALKING", "RUNNING", "HIKING", "BIKING", "SWIMMING"]);

function pct(now, prev) {
  if (!prev) return null;
  return Math.round(((now - prev) / prev) * 100);
}

export async function GET() {
  try {
    const res = await healthFetch("/users/me/dataTypes/exercise/dataPoints");
    const points = res.dataPoints ?? [];

    const activities = points
      .map((p) => {
        const e = p.exercise ?? {};
        const m = e.metricsSummary ?? {};
        return {
          rawType: e.exerciseType ?? "",
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
      .filter((a) => a.start)
      .sort((a, b) => new Date(b.start) - new Date(a.start));

    const now = Date.now();
    const DAY = 86_400_000;
    const inRange = (a, from, to) => {
      const t = new Date(a.start).getTime();
      return t >= from && t < to;
    };
    const sum = (arr, key) => arr.reduce((s, a) => s + (a[key] || 0), 0);

    const thisWeekActs = activities.filter((a) =>
      inRange(a, now - 7 * DAY, now + DAY)
    );
    const lastWeekActs = activities.filter((a) =>
      inRange(a, now - 14 * DAY, now - 7 * DAY)
    );

    const week = {
      count: thisWeekActs.length,
      minutes: sum(thisWeekActs, "durationMin"),
      calories: sum(thisWeekActs, "calories"),
      distanceKm: +sum(thisWeekActs, "distanceKm").toFixed(1),
      steps: sum(thisWeekActs, "steps"),
    };
    const prev = {
      count: lastWeekActs.length,
      minutes: sum(lastWeekActs, "durationMin"),
      calories: sum(lastWeekActs, "calories"),
      distanceKm: +sum(lastWeekActs, "distanceKm").toFixed(1),
    };

    // Attività per giorno (ultimi 7 giorni, da 6 giorni fa a oggi)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * DAY);
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const acts = activities.filter((a) => inRange(a, from, from + DAY));
      days.push({
        label: d.toLocaleDateString("it-IT", { weekday: "narrow" }),
        minutes: sum(acts, "durationMin"),
      });
    }

    // Bilancio cardio vs forza (per minuti, questa settimana)
    const cardioMin = sum(
      thisWeekActs.filter((a) => CARDIO.has(a.rawType)),
      "durationMin"
    );
    const strengthMin = week.minutes - cardioMin;

    // Frase-insight principale
    const dMin = pct(week.minutes, prev.minutes);
    let headline;
    if (week.count === 0) {
      headline = "Nessuna attività negli ultimi 7 giorni. <b>Un movimento oggi</b> riparte la serie.";
    } else if (dMin != null && dMin >= 10) {
      headline = `Settimana in crescita: <b>+${dMin}%</b> di minuti attivi rispetto alla scorsa.`;
    } else if (dMin != null && dMin <= -10) {
      headline = `Hai rallentato: <b>${dMin}%</b> di minuti attivi sulla scorsa settimana.`;
    } else if (cardioMin > 0 && strengthMin > 0) {
      headline = `Bel mix: <b>${Math.round((cardioMin / week.minutes) * 100)}% cardio</b> e ${Math.round((strengthMin / week.minutes) * 100)}% forza questa settimana.`;
    } else {
      headline = `<b>${week.count} attività</b> e ${week.minutes} minuti attivi negli ultimi 7 giorni.`;
    }

    return NextResponse.json({
      headline,
      week,
      deltas: {
        minutes: pct(week.minutes, prev.minutes),
        calories: pct(week.calories, prev.calories),
        distanceKm: pct(week.distanceKm, prev.distanceKm),
      },
      days,
      balance: { cardioMin, strengthMin },
      activities: activities.slice(0, 15),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 });
  }
}
