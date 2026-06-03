import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const logPath = join(process.cwd(), "deploy_ci.log");
  try {
    const content = readFileSync(logPath, "utf8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    return NextResponse.json({ lines: lines.slice(-150) });
  } catch {
    return NextResponse.json({ lines: [] });
  }
}
