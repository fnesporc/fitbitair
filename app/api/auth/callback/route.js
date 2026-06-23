import { NextResponse } from "next/server";
import { exchangeCodeForTokens, saveTokens } from "../../../../lib/google-health";

export const dynamic = "force-dynamic";

// Fitbit reindirizza qui dopo l'autorizzazione, con ?code=...
export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${process.env.APP_URL}/?error=missing_code`);
  }
  try {
    const tokens = await exchangeCodeForTokens(code);
    saveTokens(tokens);
  } catch (e) {
    return NextResponse.redirect(`${process.env.APP_URL}/?error=token`);
  }
  return NextResponse.redirect(process.env.APP_URL);
}
