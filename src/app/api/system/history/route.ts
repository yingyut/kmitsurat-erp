import { execSync } from "child_process";
import { NextResponse } from "next/server";

export async function GET() {
  const dir = process.cwd();
  try {
    const currentHash = execSync("git rev-parse HEAD", { cwd: dir }).toString().trim();
    const raw = execSync(
      "git log -20 --pretty=format:%H||%h||%s||%ci||%an",
      { cwd: dir, timeout: 10000 }
    ).toString().trim();

    const commits = raw.split("\n").filter(Boolean).map(line => {
      const [hash, short, message, date, author] = line.split("||");
      return { hash, short, message, date, author, isCurrent: hash === currentHash };
    });

    return NextResponse.json({ commits, currentHash });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
