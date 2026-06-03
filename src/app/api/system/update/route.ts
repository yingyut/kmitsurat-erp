import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export async function POST() {
  const dir = process.cwd();
  const deployScript = join(dir, "deploy_ci.ps1").replace(/\//g, "\\");
  const triggerScript = join(dir, "_trigger_update.ps1").replace(/\//g, "\\");

  try {
    const ps = `
$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -File \`"${deployScript}\`""
$t = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(3)
$p = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$s = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
Unregister-ScheduledTask -TaskName 'KMIT_ERP_Deploy' -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName 'KMIT_ERP_Deploy' -Action $a -Trigger $t -Principal $p -Settings $s -Force | Out-Null
Start-ScheduledTask -TaskName 'KMIT_ERP_Deploy'
`.trim();

    writeFileSync(triggerScript, ps, "utf8");
    execSync(`powershell -ExecutionPolicy Bypass -File "${triggerScript}"`, { timeout: 15000 });

    return NextResponse.json({ ok: true, message: "Update triggered. Server will restart in ~2 minutes." });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
