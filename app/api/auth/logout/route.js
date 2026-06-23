import { NextResponse } from "next/server";
import { clearTokens } from "../../../../lib/google-health";

export const dynamic = "force-dynamic";

export async function GET() {
  clearTokens();
  return NextResponse.redirect(process.env.APP_URL);
}
