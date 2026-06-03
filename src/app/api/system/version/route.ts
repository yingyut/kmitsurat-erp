import { execSync } from "child_process";
import { NextResponse } from "next/server";

function run(cmd: string) {
  return execSync(cmd, { cwd: process.cwd(), timeout: 10000 }).toString().trim();
}

export async function GET() {
  try {
    const hash    = run("git rev-parse HEAD");
    const short   = run("git rev-parse --short HEAD");
    const message = run("git log -1 --pretty=%s");
    const date    = run("git log -1 --pretty=%ci");
    const author  = run("git log -1 --pretty=%an");

    let newCommits = 0;
    try {
      run("git fetch origin master --quiet");
      newCommits = parseInt(run("git rev-list HEAD..origin/master --count") || "0");
    } catch {}

    return NextResponse.json({ hash, short, message, date, author, newCommits });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
