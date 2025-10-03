// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Good!" });
}