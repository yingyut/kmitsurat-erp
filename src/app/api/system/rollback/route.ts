import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const hash: string = body?.hash ?? "";

  if (!hash || !/^[0-9a-f]{7,40}$/i.test(hash)) {
    return NextResponse.json({ error: "Invalid commit hash" }, { status: 400 });
  }

  const dir = process.cwd();
  const dirWin     = dir.replace(/\//g, "\\");
  const parentLock = join(dir, "..", "package-lock.json").replace(/\//g, "\\");
  const serverLog  = join(dir, "server.log").replace(/\//g, "\\");
  const deployLog  = join(dir, "deploy_ci.log").replace(/\//g, "\\");
  const rollScript  = join(dir, "_rollback_tmp.ps1").replace(/\//g, "\\");
  const trigScript  = join(dir, "_trigger_rollback.ps1").replace(/\//g, "\\");

  try {
    const rollback = `
$ErrorActionPreference = "Continue"
$dir = '${dirWin}'
$log = '${deployLog}'
function Log { param($m) $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'; "$ts  $m" | Tee-Object -FilePath $log -Append }
function Run { param($cmd) $out = cmd /c "$cmd 2>&1"; $out | ForEach-Object { Log $_ } }

Log "=== Rollback to ${hash} started ==="
Set-Location $dir
Run 'git reset --hard ${hash}'
Run 'git checkout-index -a -f'
Log "[2] npm install..."
Run 'npm install --prefer-offline'
Log "[3] npm build..."
$plock = '${parentLock}'
if (Test-Path $plock) { Remove-Item $plock -Force; Log "Removed stray lock" }
if (Test-Path ".next") { Remove-Item ".next" -Recurse -Force }
Run 'npm run build'
Log "[4] Stopping old server..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3
$lpid = (netstat -ano | Select-String ":3100 " | Select-String "LISTENING") | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1
if ($lpid) { Stop-Process -Id ([int]$lpid) -Force -ErrorAction SilentlyContinue }
Start-Sleep 2
Log "[5] Starting server..."
$slog = '${serverLog}'
$a = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c set PORT=3100 && npm start >> \`"$slog\`" 2>&1" -WorkingDirectory $dir
$t = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(5)
$s = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable
$p = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Unregister-ScheduledTask -TaskName "KMIT_ERP_Server" -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName "KMIT_ERP_Server" -Action $a -Trigger $t -Settings $s -Principal $p -Force | Out-Null
Start-ScheduledTask -TaskName "KMIT_ERP_Server"
Start-Sleep 8
Log "=== Rollback finished ==="
`.trim();

    const trigger = `
$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -File \`"${rollScript}\`""
$t = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(3)
$p = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$s = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
Unregister-ScheduledTask -TaskName 'KMIT_ERP_Deploy' -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName 'KMIT_ERP_Deploy' -Action $a -Trigger $t -Principal $p -Settings $s -Force | Out-Null
Start-ScheduledTask -TaskName 'KMIT_ERP_Deploy'
`.trim();

    writeFileSync(rollScript, rollback, "utf8");
    writeFileSync(trigScript, trigger, "utf8");
    execSync(`powershell -ExecutionPolicy Bypass -File "${trigScript}"`, { timeout: 15000 });

    return NextResponse.json({ ok: true, message: `Rollback to ${hash} triggered.` });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
