import { NextResponse } from "next/server";
import { healthFetch } from "../../../lib/google-health";

export const dynamic = "force-dynamic";

function secs(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace("s", ""));
}
function pad(n) {
  return String(n).padStart(2, "0");
}
// Chiave giorno locale (Italia) da una data ISO.
const romeFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const romeKey = (iso) => romeFmt.format(new Date(iso));

const ICONS = {
  WALKING: "🚶", RUNNING: "🏃", HIKING: "🥾", BIKING: "🚴", SWIMMING: "🏊",
  WEIGHTS: "🏋️", WORKOUT: "🏋️", STRENGTH_TRAINING: "🏋️",
};
const CARDIO = new Set(["WALKING", "RUNNING", "HIKING", "BIKING", "SWIMMING"]);

function pct(now, prev) {
  if (!prev) return null;
  return Math.round(((now - prev) / prev) * 100);
}

async function safeFetch(path) {
  try { return await healthFetch(path); } catch { return null; }
}

// --- parser dei nuovi tipi ---
function parseSteps(res) {
  const byDay = {};
  for (const p of res?.dataPoints ?? []) {
    const s = p.steps;
    if (!s) continue;
    const c = s.interval?.civilStartTime?.date;
    const key = c ? `${c.year}-${pad(c.month)}-${pad(c.day)}` : s.interval?.startTime ? romeKey(s.interval.startTime) : null;
    if (!key) continue;
    byDay[key] = (byDay[key] || 0) + Number(s.count || 0);
  }
  return byDay;
}
function parseRhr(res) {
  return (res?.dataPoints ?? [])
    .map((p) => {
      const r = p.dailyRestingHeartRate;
      if (!r?.date) return null;
      return { key: `${r.date.year}-${pad(r.date.month)}-${pad(r.date.day)}`, bpm: Number(r.beatsPerMinute) };
    })
    .filter(Boolean)
    .sort((a, b) => (a.key < b.key ? 1 : -1)); // più recente prima
}
function parseSleep(res) {
  return (res?.dataPoints ?? [])
    .map((p) => {
      const s = p.sleep;
      if (!s?.summary) return null;
      const stages = {};
      for (const st of s.summary.stagesSummary ?? []) stages[st.type] = Number(st.minutes);
      return {
        key: s.interval?.endTime ? romeKey(s.interval.endTime) : null,
        asleep: Number(s.summary.minutesAsleep || 0),
        inBed: Number(s.summary.minutesInSleepPeriod || 0),
        stages,
      };
    })
    .filter((n) => n && n.key)
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

export async function GET() {
  try {
    const [exRes, stepsRes, sleepRes, rhrRes] = await Promise.all([
      healthFetch("/users/me/dataTypes/exercise/dataPoints"),
      safeFetch("/users/me/dataTypes/steps/dataPoints"),
      safeFetch("/users/me/dataTypes/sleep/dataPoints"),
      safeFetch("/users/me/dataTypes/daily-resting-heart-rate/dataPoints"),
    ]);

    const stepsByDay = parseSteps(stepsRes);
    const rhrSeries = parseRhr(rhrRes);
    const nights = parseSleep(sleepRes);

    const activities = (exRes.dataPoints ?? [])
      .map((p) => {
        const e = p.exercise ?? {};
        const m = e.metricsSummary ?? {};
        const z = m.heartRateZoneDurations;
        return {
          rawType: e.exerciseType ?? "",
          type: e.displayName ?? e.exerciseType ?? "Attività",
          icon: ICONS[e.exerciseType] ?? "🏃",
          start: e.interval?.startTime ?? null,
          durationMin: Math.round(secs(e.activeDuration) / 60),
          calories: m.caloriesKcal ?? null,
          steps: m.steps ? Number(m.steps) : null,
          distanceKm: m.distanceMillimeters ? +(m.distanceMillimeters / 1_000_000).toFixed(2) : null,
          avgHr: m.averageHeartRateBeatsPerMinute ? Number(m.averageHeartRateBeatsPerMinute) : null,
          zones: z ? { light: Math.round(secs(z.lightTime) / 60), moderate: Math.round(secs(z.moderateTime) / 60), vigorous: Math.round(secs(z.vigorousTime) / 60), peak: Math.round(secs(z.peakTime) / 60) } : null,
          hasGps: e.exerciseMetadata?.hasGps ?? false,
          azm: m.activeZoneMinutes ? Number(m.activeZoneMinutes) : null,
        };
      })
      .filter((a) => a.start)
      .sort((a, b) => new Date(b.start) - new Date(a.start));

    const now = Date.now();
    const DAY = 86_400_000;
    const todayKey = romeKey(new Date());
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
    };
    const prev = {
      minutes: sum(lastWeekActs, "durationMin"),
      calories: sum(lastWeekActs, "calories"),
      distanceKm: +sum(lastWeekActs, "distanceKm").toFixed(1),
    };

    // Giorni (ultimi 7): minuti attivi + passi
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * DAY);
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const key = romeKey(d);
      const acts = activities.filter((a) => inRange(a, from, from + DAY));
      days.push({
        label: d.toLocaleDateString("it-IT", { weekday: "narrow" }),
        minutes: sum(acts, "durationMin"),
        steps: stepsByDay[key] || 0,
      });
    }

    // Serie giorni consecutivi
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(now - i * DAY);
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const has = activities.some((a) => inRange(a, from, from + DAY));
      if (has) streak++;
      else if (i === 0) continue;
      else break;
    }

    const cardioMin = sum(thisWeekActs.filter((a) => CARDIO.has(a.rawType)), "durationMin");
    const strengthMin = week.minutes - cardioMin;

    const GOAL = 150;
    const goal = { target: GOAL, value: week.minutes, pct: Math.min(100, Math.round((week.minutes / GOAL) * 100)) };

    // --- Sezione "Oggi" ---
    const rhrToday = rhrSeries.find((r) => r.key === todayKey)?.bpm ?? rhrSeries[0]?.bpm ?? null;
    const rhrAvg = rhrSeries.length ? Math.round(rhrSeries.slice(0, 14).reduce((s, r) => s + r.bpm, 0) / Math.min(14, rhrSeries.length)) : null;
    const lastNight = nights[0] ?? null;
    const today = {
      steps: stepsByDay[todayKey] || 0,
      stepsGoal: 10000,
      restingHr: rhrToday,
      restingHrAvg: rhrAvg,
      sleep: lastNight ? { asleep: lastNight.asleep, inBed: lastNight.inBed, stages: lastNight.stages, key: lastNight.key } : null,
    };

    // --- Insight ---
    const insights = [];
    const dMin = pct(week.minutes, prev.minutes);
    if (streak >= 2) insights.push({ icon: "🔥", text: `Serie attiva: ${streak} giorni di fila con attività.` });
    if (today.steps >= today.stepsGoal) insights.push({ icon: "👟", text: `Obiettivo passi di oggi raggiunto: ${today.steps.toLocaleString("it-IT")}.` });
    if (lastNight) {
      const h = Math.floor(lastNight.asleep / 60), m = lastNight.asleep % 60;
      if (lastNight.asleep < 420) insights.push({ icon: "😴", text: `Stanotte hai dormito ${h}h ${m}m, sotto le 7h consigliate.` });
      else insights.push({ icon: "😴", text: `Bel riposo: ${h}h ${m}m di sonno stanotte.` });
    }
    if (rhrToday && rhrAvg && rhrToday <= rhrAvg - 2) insights.push({ icon: "❤️", text: `Battito a riposo ${rhrToday} bpm, sotto la tua media (${rhrAvg}): buon segno di recupero.` });
    if (rhrToday && rhrAvg && rhrToday >= rhrAvg + 4) insights.push({ icon: "⚠️", text: `Battito a riposo ${rhrToday} bpm, sopra la media (${rhrAvg}): potresti essere stanco o stressato.` });
    if (goal.pct >= 100) insights.push({ icon: "🎯", text: `Obiettivo settimanale raggiunto: ${week.minutes} min (target ${GOAL}).` });
    else if (week.minutes > 0) insights.push({ icon: "🎯", text: `Ti mancano ${GOAL - week.minutes} min per l'obiettivo settimanale.` });
    if (dMin != null && dMin >= 10) insights.push({ icon: "📈", text: `+${dMin}% di minuti attivi rispetto alla scorsa settimana.` });
    if (dMin != null && dMin <= -10) insights.push({ icon: "📉", text: `${dMin}% di minuti attivi sulla scorsa settimana: rallenta il ritmo.` });
    if (cardioMin > 0 && strengthMin > 0) insights.push({ icon: "⚖️", text: `Mix equilibrato: ${Math.round((cardioMin / week.minutes) * 100)}% cardio, ${Math.round((strengthMin / week.minutes) * 100)}% forza.` });

    const headline = insights[0]?.text
      ?? (week.count ? `${week.count} attività e ${week.minutes} minuti attivi negli ultimi 7 giorni.` : "Nessuna attività negli ultimi 7 giorni. Un movimento oggi riparte la serie.");

    return NextResponse.json({
      headline,
      insights,
      today,
      week,
      deltas: { minutes: pct(week.minutes, prev.minutes), calories: pct(week.calories, prev.calories), distanceKm: pct(week.distanceKm, prev.distanceKm) },
      days,
      streak,
      goal,
      balance: { cardioMin, strengthMin },
      rhrSeries: rhrSeries.slice(0, 14),
      activities: activities.slice(0, 20),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 });
  }
}
