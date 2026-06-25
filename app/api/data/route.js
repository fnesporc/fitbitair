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
  HIKING: "🥾",
  BIKING: "🚴",
  SWIMMING: "🏊",
  WEIGHTS: "🏋️",
  WORKOUT: "🏋️",
  STRENGTH_TRAINING: "🏋️",
};
const CARDIO = new Set(["WALKING", "RUNNING", "HIKING", "BIKING", "SWIMMING"]);

function pct(now, prev) {
  if (!prev) return null;
  return Math.round(((now - prev) / prev) * 100);
}

// Fetch che non lancia: se l'endpoint non c'è/è vuoto torna null.
async function safeFetch(path) {
  try {
    return await healthFetch(path);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const [exRes, stepsRes, sleepRes, rhrRes] = await Promise.all([
      healthFetch("/users/me/dataTypes/exercise/dataPoints"),
      safeFetch("/users/me/dataTypes/steps/dataPoints"),
      safeFetch("/users/me/dataTypes/sleep/dataPoints"),
      safeFetch("/users/me/dataTypes/daily-resting-heart-rate/dataPoints"),
    ]);

    const points = exRes.dataPoints ?? [];

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
          zones: m.heartRateZoneDurations
            ? {
                light: Math.round(secs(m.heartRateZoneDurations.lightTime) / 60),
                moderate: Math.round(secs(m.heartRateZoneDurations.moderateTime) / 60),
                vigorous: Math.round(secs(m.heartRateZoneDurations.vigorousTime) / 60),
                peak: Math.round(secs(m.heartRateZoneDurations.peakTime) / 60),
              }
            : null,
          hasGps: e.exerciseMetadata?.hasGps ?? false,
          azm: m.activeZoneMinutes ? Number(m.activeZoneMinutes) : null,
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

    const thisWeekActs = activities.filter((a) => inRange(a, now - 7 * DAY, now + DAY));
    const lastWeekActs = activities.filter((a) => inRange(a, now - 14 * DAY, now - 7 * DAY));

    const week = {
      count: thisWeekActs.length,
      minutes: sum(thisWeekActs, "durationMin"),
      calories: sum(thisWeekActs, "calories"),
      distanceKm: +sum(thisWeekActs, "distanceKm").toFixed(1),
      steps: sum(thisWeekActs, "steps"),
    };
    const prev = {
      minutes: sum(lastWeekActs, "durationMin"),
      calories: sum(lastWeekActs, "calories"),
      distanceKm: +sum(lastWeekActs, "distanceKm").toFixed(1),
    };

    // Attività per giorno (ultimi 7)
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

    // Serie 🔥: giorni consecutivi con attività, fino a oggi (o ieri).
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(now - i * DAY);
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const has = activities.some((a) => inRange(a, from, from + DAY));
      if (has) streak++;
      else if (i === 0) continue; // oggi può ancora arrivare
      else break;
    }

    // Bilancio cardio/forza
    const cardioMin = sum(thisWeekActs.filter((a) => CARDIO.has(a.rawType)), "durationMin");
    const strengthMin = week.minutes - cardioMin;

    // Obiettivo OMS: 150 min attivi/settimana
    const GOAL = 150;
    const goal = { target: GOAL, value: week.minutes, pct: Math.min(100, Math.round((week.minutes / GOAL) * 100)) };

    // Insight intelligenti (lista)
    const insights = [];
    const dMin = pct(week.minutes, prev.minutes);
    if (streak >= 2) insights.push({ icon: "🔥", text: `Serie attiva: ${streak} giorni di fila con attività.` });
    if (goal.pct >= 100) insights.push({ icon: "🎯", text: `Obiettivo settimanale raggiunto: ${week.minutes} min (target ${GOAL}).` });
    else if (week.minutes > 0) insights.push({ icon: "🎯", text: `Ti mancano ${GOAL - week.minutes} min per l'obiettivo settimanale.` });
    if (dMin != null && dMin >= 10) insights.push({ icon: "📈", text: `+${dMin}% di minuti attivi rispetto alla scorsa settimana.` });
    if (dMin != null && dMin <= -10) insights.push({ icon: "📉", text: `${dMin}% di minuti attivi sulla scorsa settimana: rallenta il ritmo.` });
    // Trend battito in camminata (più basso = migliore forma)
    const walks = activities.filter((a) => a.rawType === "WALKING" && a.avgHr).slice(0, 6);
    if (walks.length >= 4) {
      const recent = walks.slice(0, 2).reduce((s, a) => s + a.avgHr, 0) / 2;
      const older = walks.slice(-2).reduce((s, a) => s + a.avgHr, 0) / 2;
      if (recent <= older - 3) insights.push({ icon: "❤️", text: `Battito medio in camminata in calo (${Math.round(older)}→${Math.round(recent)} bpm): stai migliorando.` });
    }
    if (cardioMin > 0 && strengthMin > 0) insights.push({ icon: "⚖️", text: `Mix equilibrato: ${Math.round((cardioMin / week.minutes) * 100)}% cardio, ${Math.round((strengthMin / week.minutes) * 100)}% forza.` });

    // Headline = primo insight, o fallback
    const headline = insights[0]
      ? `${insights[0].text}`
      : week.count
      ? `${week.count} attività e ${week.minutes} minuti attivi negli ultimi 7 giorni.`
      : "Nessuna attività negli ultimi 7 giorni. Un movimento oggi riparte la serie.";

    return NextResponse.json({
      headline,
      insights,
      week,
      deltas: { minutes: pct(week.minutes, prev.minutes), calories: pct(week.calories, prev.calories), distanceKm: pct(week.distanceKm, prev.distanceKm) },
      days,
      streak,
      goal,
      balance: { cardioMin, strengthMin },
      activities: activities.slice(0, 20),
      // grezzo dei nuovi tipi: serve per cablarli con precisione al prossimo giro
      debug: {
        steps: stepsRes?.dataPoints?.slice(0, 2) ?? null,
        sleep: sleepRes?.dataPoints?.slice(0, 1) ?? null,
        restingHr: rhrRes?.dataPoints?.slice(0, 2) ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 });
  }
}
