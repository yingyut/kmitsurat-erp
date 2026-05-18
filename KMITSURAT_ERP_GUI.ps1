Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($false)
[System.Windows.Forms.Application]::EnableVisualStyles()

# === PATHS ===
$scriptDir  = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$configPath = Join-Path $scriptDir "config.ini"
$iconPath   = Join-Path $scriptDir "icon.ico"
$logoPath   = Join-Path $scriptDir "kmit_logo.png"

# === CONFIG ===
$cfg = [ordered]@{
    ERP_IP     = "172.16.1.60"
    ERP_PORT   = "3100"
    VPN_NAME   = "KMIT"
    VPN_SERVER = "hf1090pg7wb.sn.mynetname.net"
    ERP_NAME   = "KMITSURAT ERP"
}
function Read-Config {
    if (-not (Test-Path $configPath)) { return }
    Get-Content $configPath | ForEach-Object {
        if ($_ -match "^\s*([A-Za-z_]+)\s*=\s*(.+)$") {
            $k = $Matches[1]; $v = $Matches[2].Trim()
            if ($cfg.Contains($k)) { $cfg[$k] = $v }
        }
    }
}
function Save-Config {
    @("; KMITSURAT ERP Launcher", "[Settings]",
      "ERP_IP=$($cfg.ERP_IP)",     "ERP_PORT=$($cfg.ERP_PORT)",
      "VPN_NAME=$($cfg.VPN_NAME)", "VPN_SERVER=$($cfg.VPN_SERVER)",
      "ERP_NAME=$($cfg.ERP_NAME)"
    ) | Set-Content $configPath -Encoding UTF8
}
function Test-Server {
    param([string]$ip)
    try { return (New-Object System.Net.NetworkInformation.Ping).Send($ip, 2000).Status -eq "Success" }
    catch { return $false }
}
Read-Config

# ============================================================
# PALETTE  -  KMIT brand teal on deep navy
# ============================================================
$bgBase    = [System.Drawing.Color]::FromArgb(  8,  16,  34)   # deep navy
$bgSurface = [System.Drawing.Color]::FromArgb( 13,  26,  54)   # header / tab bg
$bgInput   = [System.Drawing.Color]::FromArgb(  6,  12,  24)   # text field bg

$acTeal    = [System.Drawing.Color]::FromArgb(  0, 188, 212)   # KMIT teal (logo arrow)
$acTealD   = [System.Drawing.Color]::FromArgb(  0,  75,  95)   # dim teal (separators)
$acGreen   = [System.Drawing.Color]::FromArgb( 34, 197,  94)   # success
$acAmber   = [System.Drawing.Color]::FromArgb(245, 158,  11)   # warning
$txHigh    = [System.Drawing.Color]::FromArgb(220, 232, 248)   # near-white
$txMid     = [System.Drawing.Color]::FromArgb(140, 158, 182)   # mid slate
$txDim     = [System.Drawing.Color]::FromArgb( 50,  68,  92)   # dim

# Button gradient pairs  [top, bottom]
$colTeal  = @([System.Drawing.Color]::FromArgb(  0,168,198), [System.Drawing.Color]::FromArgb(  0,100,130))
$colAmber = @([System.Drawing.Color]::FromArgb(210,130,  0), [System.Drawing.Color]::FromArgb(145, 85,  0))
$colGhost = @([System.Drawing.Color]::FromArgb( 26, 40, 62), [System.Drawing.Color]::FromArgb( 16, 26, 42))

# ============================================================
# FONTS  -  larger throughout
# ============================================================
$fTitle = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$fBody  = New-Object System.Drawing.Font("Segoe UI", 10)
$fBold  = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$fMono  = New-Object System.Drawing.Font("Consolas", 11)
$fBtn   = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$fSmall = New-Object System.Drawing.Font("Segoe UI",  8, [System.Drawing.FontStyle]::Bold)
$fTab   = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$fMini  = New-Object System.Drawing.Font("Segoe UI",  8)

# ============================================================
# HELPERS
# ============================================================
function Get-RoundedPath {
    param([System.Drawing.Rectangle]$r, [int]$rad)
    $d    = $rad * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($r.Left,         $r.Top,          $d, $d, 180, 90)
    $path.AddArc($r.Right - $d,   $r.Top,          $d, $d, 270, 90)
    $path.AddArc($r.Right - $d,   $r.Bottom - $d,  $d, $d,   0, 90)
    $path.AddArc($r.Left,         $r.Bottom - $d,  $d, $d,  90, 90)
    $path.CloseFigure()
    return $path
}

# Rounded 3D gradient button
# Tag = @{ CP=colorPair; FG=fgColor; Active=bool; Hover=bool; Pressed=bool }
function New-RoundBtn {
    param($text, $x, $y, $w, $h, $colPair, $fgColor, $active, $parent)
    $b = New-Object System.Windows.Forms.Button
    $b.Text      = $text
    $b.Location  = New-Object System.Drawing.Point($x, $y)
    $b.Size      = New-Object System.Drawing.Size($w, $h)
    $b.Font      = $fBtn
    $b.FlatStyle = "Flat"
    $b.FlatAppearance.BorderSize             = 0
    $b.FlatAppearance.MouseOverBackColor     = [System.Drawing.Color]::FromArgb(0,0,0,0)
    $b.FlatAppearance.MouseDownBackColor     = [System.Drawing.Color]::FromArgb(0,0,0,0)
    $b.BackColor = $bgBase
    $b.ForeColor = $fgColor
    $b.Cursor    = [System.Windows.Forms.Cursors]::Hand
    $b.Tag       = @{ CP=$colPair; FG=$fgColor; Active=$active; Hover=$false; Pressed=$false }

    $b.Add_Paint({
        param($s, $e)
        $g   = $e.Graphics
        $g.SmoothingMode   = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $tag = $s.Tag
        $c1  = $tag["CP"][0];  $c2 = $tag["CP"][1];  $fg = $tag["FG"]

        $inner = New-Object System.Drawing.Rectangle(1, 1, ($s.Width-3), ($s.Height-3))
        $rad   = 10
        $path  = Get-RoundedPath $inner $rad

        # gradient base
        $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $inner, $c1, $c2, [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
        $g.FillPath($grad, $path)
        $grad.Dispose()

        # top gloss (upper 42%)
        $gh    = [int]($inner.Height * 0.42)
        $clipR = New-Object System.Drawing.Rectangle($inner.X, $inner.Y, $inner.Width, $gh)
        $gloss = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(48, 255, 255, 255))
        $g.SetClip($clipR)
        $g.FillPath($gloss, $path)
        $gloss.Dispose()
        $g.ResetClip()

        # hover / press overlay
        if ($tag["Pressed"]) {
            $ov = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 0, 0, 0))
            $g.FillPath($ov, $path); $ov.Dispose()
        } elseif ($tag["Hover"]) {
            $ov = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 255, 255, 255))
            $g.FillPath($ov, $path); $ov.Dispose()
        }

        # border
        $bp = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(150, $c1.R, $c1.G, $c1.B), 1)
        $g.DrawPath($bp, $path)
        $bp.Dispose(); $path.Dispose()

        # text - GDI (sharp)
        $tf   = [System.Windows.Forms.TextFormatFlags]::HorizontalCenter -bor `
                [System.Windows.Forms.TextFormatFlags]::VerticalCenter
        $tRect = New-Object System.Drawing.Rectangle(0, 0, $s.Width, $s.Height)
        [System.Windows.Forms.TextRenderer]::DrawText($g, $s.Text, $s.Font, $tRect, $fg, $tf)
    })

    $b.Add_MouseEnter({
        param($s,$ea); $s.Tag["Hover"]=$true; $s.Invalidate()
    })
    $b.Add_MouseLeave({
        param($s,$ea); $s.Tag["Hover"]=$false; $s.Tag["Pressed"]=$false; $s.Invalidate()
    })
    $b.Add_MouseDown({
        param($s,$ea); $s.Tag["Pressed"]=$true; $s.Invalidate()
    })
    $b.Add_MouseUp({
        param($s,$ea); $s.Tag["Pressed"]=$false; $s.Invalidate()
    })

    $parent.Controls.Add($b)
    return $b
}

# Underline text field
function New-Field {
    param($labelText, $value, $hint, $x, $y, $w, $parent)
    $lb = New-Object System.Windows.Forms.Label
    $lb.Text      = $labelText.ToUpper()
    $lb.Location  = New-Object System.Drawing.Point($x, $y)
    $lb.Size      = New-Object System.Drawing.Size([int]($w*0.55), 16)
    $lb.Font      = $fSmall
    $lb.ForeColor = $txDim
    $lb.BackColor = $bgBase
    $parent.Controls.Add($lb)

    if ($hint) {
        $lh = New-Object System.Windows.Forms.Label
        $lh.Text      = $hint
        $lh.Location  = New-Object System.Drawing.Point(($x + [int]($w*0.55)), $y)
        $lh.Size      = New-Object System.Drawing.Size([int]($w*0.45), 16)
        $lh.Font      = $fMini
        $lh.ForeColor = $txDim
        $lh.TextAlign = [System.Drawing.ContentAlignment]::MiddleRight
        $lh.BackColor = $bgBase
        $parent.Controls.Add($lh)
    }

    $tb = New-Object System.Windows.Forms.TextBox
    $tb.Text        = $value
    $tb.Location    = New-Object System.Drawing.Point($x, ($y+18))
    $tb.Size        = New-Object System.Drawing.Size($w, 26)
    $tb.Font        = $fMono
    $tb.BackColor   = $bgBase
    $tb.ForeColor   = $txHigh
    $tb.BorderStyle = "None"
    $parent.Controls.Add($tb)

    $ul = New-Object System.Windows.Forms.Panel
    $ul.Location  = New-Object System.Drawing.Point($x, ($y+46))
    $ul.Size      = New-Object System.Drawing.Size($w, 1)
    $ul.BackColor = $acTealD
    $parent.Controls.Add($ul)

    return $tb
}

# ============================================================
# FORM
# ============================================================
$form = New-Object System.Windows.Forms.Form
$form.Text            = $cfg.ERP_NAME
$form.ClientSize      = New-Object System.Drawing.Size(460, 570)
$form.StartPosition   = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox     = $false
$form.BackColor       = $bgBase
$form.Font            = $fBody
if (Test-Path $iconPath) { $form.Icon = New-Object System.Drawing.Icon($iconPath) }

# ── HEADER ───────────────────────────────────────────────────
$pnlHdr = New-Object System.Windows.Forms.Panel
$pnlHdr.Location  = New-Object System.Drawing.Point(0, 0)
$pnlHdr.Size      = New-Object System.Drawing.Size(460, 86)
$pnlHdr.BackColor = $bgSurface
$form.Controls.Add($pnlHdr)

if (Test-Path $logoPath) {
    $img = [System.Drawing.Image]::FromFile($logoPath)
    $pb  = New-Object System.Windows.Forms.PictureBox
    $pb.Image    = $img
    $pb.SizeMode = "Zoom"
    $pb.Location = New-Object System.Drawing.Point(16, 12)
    $pb.Size     = New-Object System.Drawing.Size(60, 60)
    $pb.BackColor = $bgSurface
    $pnlHdr.Controls.Add($pb)
    $tx = 88
} else { $tx = 16 }

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text      = $cfg.ERP_NAME
$lblTitle.Location  = New-Object System.Drawing.Point($tx, 18)
$lblTitle.Size      = New-Object System.Drawing.Size(360, 34)
$lblTitle.Font      = $fTitle
$lblTitle.ForeColor = $acTeal
$lblTitle.BackColor = $bgSurface
$pnlHdr.Controls.Add($lblTitle)

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text      = "Intelligent ERP Access Launcher"
$lblSub.Location  = New-Object System.Drawing.Point($tx, 56)
$lblSub.Size      = New-Object System.Drawing.Size(360, 16)
$lblSub.Font      = $fMini
$lblSub.ForeColor = $txDim
$lblSub.BackColor = $bgSurface
$pnlHdr.Controls.Add($lblSub)

$lnHdr = New-Object System.Windows.Forms.Panel
$lnHdr.Location  = New-Object System.Drawing.Point(0, 86)
$lnHdr.Size      = New-Object System.Drawing.Size(460, 1)
$lnHdr.BackColor = $acTealD
$form.Controls.Add($lnHdr)

# ── TAB BAR ──────────────────────────────────────────────────
$pnlTabs = New-Object System.Windows.Forms.Panel
$pnlTabs.Location  = New-Object System.Drawing.Point(0, 87)
$pnlTabs.Size      = New-Object System.Drawing.Size(460, 44)
$pnlTabs.BackColor = $bgSurface
$form.Controls.Add($pnlTabs)

$btnTC = New-Object System.Windows.Forms.Button
$btnTC.Text      = "CONNECT"
$btnTC.Location  = New-Object System.Drawing.Point(0, 0)
$btnTC.Size      = New-Object System.Drawing.Size(135, 42)
$btnTC.Font      = $fTab
$btnTC.FlatStyle = "Flat"
$btnTC.FlatAppearance.BorderSize         = 0
$btnTC.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(18, 0, 188, 212)
$btnTC.BackColor = $bgSurface
$btnTC.ForeColor = $acTeal
$btnTC.Cursor    = [System.Windows.Forms.Cursors]::Hand
$pnlTabs.Controls.Add($btnTC)

$btnTS = New-Object System.Windows.Forms.Button
$btnTS.Text      = "SETTINGS"
$btnTS.Location  = New-Object System.Drawing.Point(135, 0)
$btnTS.Size      = New-Object System.Drawing.Size(135, 42)
$btnTS.Font      = $fTab
$btnTS.FlatStyle = "Flat"
$btnTS.FlatAppearance.BorderSize         = 0
$btnTS.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(18, 0, 188, 212)
$btnTS.BackColor = $bgSurface
$btnTS.ForeColor = $txDim
$btnTS.Cursor    = [System.Windows.Forms.Cursors]::Hand
$pnlTabs.Controls.Add($btnTS)

$tabLine = New-Object System.Windows.Forms.Panel
$tabLine.Location  = New-Object System.Drawing.Point(0, 41)
$tabLine.Size      = New-Object System.Drawing.Size(135, 3)
$tabLine.BackColor = $acTeal
$pnlTabs.Controls.Add($tabLine)

$lnTab = New-Object System.Windows.Forms.Panel
$lnTab.Location  = New-Object System.Drawing.Point(0, 131)
$lnTab.Size      = New-Object System.Drawing.Size(460, 1)
$lnTab.BackColor = $acTealD
$form.Controls.Add($lnTab)

$CY = 133   # content area Y start

# ============================================================
# CONNECT PANEL
# ============================================================
$pnlCon = New-Object System.Windows.Forms.Panel
$pnlCon.Location  = New-Object System.Drawing.Point(0, $CY)
$pnlCon.Size      = New-Object System.Drawing.Size(460, 437)
$pnlCon.BackColor = $bgBase
$form.Controls.Add($pnlCon)

# Server row
$lblSrvTag = New-Object System.Windows.Forms.Label
$lblSrvTag.Text      = "SERVER"
$lblSrvTag.Location  = New-Object System.Drawing.Point(24, 18)
$lblSrvTag.Size      = New-Object System.Drawing.Size(58, 16)
$lblSrvTag.Font      = $fSmall
$lblSrvTag.ForeColor = $txDim
$lblSrvTag.BackColor = $bgBase
$pnlCon.Controls.Add($lblSrvTag)

$lblURL = New-Object System.Windows.Forms.Label
$lblURL.Text      = "http://$($cfg.ERP_IP):$($cfg.ERP_PORT)"
$lblURL.Location  = New-Object System.Drawing.Point(90, 16)
$lblURL.Size      = New-Object System.Drawing.Size(346, 22)
$lblURL.Font      = $fMono
$lblURL.ForeColor = $acTeal
$lblURL.BackColor = $bgBase
$pnlCon.Controls.Add($lblURL)

# Status dot (colored Panel circle - no Unicode)
$dotPanel = New-Object System.Windows.Forms.Panel
$dotPanel.Location  = New-Object System.Drawing.Point(24, 57)
$dotPanel.Size      = New-Object System.Drawing.Size(14, 14)
$dotPanel.BackColor = $txDim
$pnlCon.Controls.Add($dotPanel)
$dotPanel.Add_Paint({
    param($s, $e)
    $g = $e.Graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear($s.Parent.BackColor)
    $br = New-Object System.Drawing.SolidBrush($s.BackColor)
    $g.FillEllipse($br, 0, 0, ($s.Width-1), ($s.Height-1))
    $br.Dispose()
})

$lblSt = New-Object System.Windows.Forms.Label
$lblSt.Text      = "Checking connection..."
$lblSt.Location  = New-Object System.Drawing.Point(44, 53)
$lblSt.Size      = New-Object System.Drawing.Size(392, 24)
$lblSt.Font      = $fBody
$lblSt.ForeColor = $txMid
$lblSt.BackColor = $bgBase
$pnlCon.Controls.Add($lblSt)

$lnSep = New-Object System.Windows.Forms.Panel
$lnSep.Location  = New-Object System.Drawing.Point(24, 86)
$lnSep.Size      = New-Object System.Drawing.Size(412, 1)
$lnSep.BackColor = $txDim
$pnlCon.Controls.Add($lnSep)

# Open ERP button (full width, rounded 3D, starts ghost/inactive)
$btnERP = New-RoundBtn -text "Open  $($cfg.ERP_NAME)" `
    -x 24 -y 100 -w 412 -h 54 `
    -colPair $colGhost -fgColor $txDim -active $false -parent $pnlCon

# VPN REQUIRED section (hidden by default)
$lblVpnTitle = New-Object System.Windows.Forms.Label
$lblVpnTitle.Text      = "VPN  REQUIRED"
$lblVpnTitle.Location  = New-Object System.Drawing.Point(24, 172)
$lblVpnTitle.Size      = New-Object System.Drawing.Size(412, 22)
$lblVpnTitle.Font      = $fBold
$lblVpnTitle.ForeColor = $acAmber
$lblVpnTitle.BackColor = $bgBase
$lblVpnTitle.Visible   = $false
$pnlCon.Controls.Add($lblVpnTitle)

$lblVpn1 = New-Object System.Windows.Forms.Label
$lblVpn1.Location  = New-Object System.Drawing.Point(24, 198)
$lblVpn1.Size      = New-Object System.Drawing.Size(412, 22)
$lblVpn1.Font      = $fMono
$lblVpn1.ForeColor = $txMid
$lblVpn1.BackColor = $bgBase
$lblVpn1.Visible   = $false
$pnlCon.Controls.Add($lblVpn1)

$lblVpn2 = New-Object System.Windows.Forms.Label
$lblVpn2.Location  = New-Object System.Drawing.Point(24, 224)
$lblVpn2.Size      = New-Object System.Drawing.Size(412, 22)
$lblVpn2.Font      = $fMono
$lblVpn2.ForeColor = $txMid
$lblVpn2.BackColor = $bgBase
$lblVpn2.Visible   = $false
$pnlCon.Controls.Add($lblVpn2)

$btnVPN = New-RoundBtn -text "Open VPN Settings" `
    -x 24 -y 256 -w 220 -h 42 `
    -colPair $colAmber -fgColor $txHigh -active $true -parent $pnlCon
$btnVPN.Visible = $false

$lnkRecheck = New-Object System.Windows.Forms.LinkLabel
$lnkRecheck.Text            = "Re-check connection"
$lnkRecheck.Location        = New-Object System.Drawing.Point(24, 308)
$lnkRecheck.Size            = New-Object System.Drawing.Size(170, 20)
$lnkRecheck.Font            = $fMini
$lnkRecheck.LinkColor       = $txDim
$lnkRecheck.ActiveLinkColor = $acTeal
$lnkRecheck.BackColor       = $bgBase
$pnlCon.Controls.Add($lnkRecheck)

# ============================================================
# SETTINGS PANEL
# ============================================================
$pnlSet = New-Object System.Windows.Forms.Panel
$pnlSet.Location  = New-Object System.Drawing.Point(0, $CY)
$pnlSet.Size      = New-Object System.Drawing.Size(460, 437)
$pnlSet.BackColor = $bgBase
$pnlSet.Visible   = $false
$form.Controls.Add($pnlSet)

$fields = @(
    @{ L="ERP IP Address";       K="ERP_IP";     H="Server IP" },
    @{ L="ERP Port";             K="ERP_PORT";   H="default 3100" },
    @{ L="VPN Connection Name";  K="VPN_NAME";   H="Windows VPN name" },
    @{ L="VPN Server Address";   K="VPN_SERVER"; H="hostname / IP" },
    @{ L="ERP Display Name";     K="ERP_NAME";   H="shown in title bar" }
)
$txb = @{}
$fy  = 14
foreach ($f in $fields) {
    $txb[$f.K] = New-Field -labelText $f.L -value $cfg[$f.K] -hint $f.H `
                            -x 24 -y $fy -w 412 -parent $pnlSet
    $fy += 60
}

$btnSave = New-RoundBtn -text "Save  &  Check Connection" `
    -x 24 -y ($fy+10) -w 412 -h 50 `
    -colPair $colTeal -fgColor $txHigh -active $true -parent $pnlSet

$lblSaveOK = New-Object System.Windows.Forms.Label
$lblSaveOK.Location  = New-Object System.Drawing.Point(24, ($fy+70))
$lblSaveOK.Size      = New-Object System.Drawing.Size(412, 22)
$lblSaveOK.Font      = $fBody
$lblSaveOK.ForeColor = $acGreen
$lblSaveOK.BackColor = $bgBase
$lblSaveOK.Text      = ""
$pnlSet.Controls.Add($lblSaveOK)

# ============================================================
# LOGIC
# ============================================================
function Switch-Tab { param([string]$t)
    $pnlCon.Visible = ($t -eq "c"); $pnlSet.Visible = ($t -eq "s")
    if ($t -eq "c") {
        $btnTC.ForeColor = $acTeal; $btnTS.ForeColor = $txDim
        $tabLine.Location = New-Object System.Drawing.Point(0, 41)
    } else {
        $btnTS.ForeColor = $acTeal; $btnTC.ForeColor = $txDim
        $tabLine.Location = New-Object System.Drawing.Point(135, 41)
    }
}

function Set-Status { param([string]$s)
    switch ($s) {
        "checking" {
            $dotPanel.BackColor       = $txDim; $dotPanel.Invalidate()
            $lblSt.ForeColor          = $txMid
            $lblSt.Text               = "Checking connection to $($cfg.ERP_IP) ..."
            $btnERP.Tag["CP"]         = $colGhost
            $btnERP.Tag["FG"]         = $txDim
            $btnERP.Tag["Active"]     = $false
            $btnERP.Invalidate()
            $lblVpnTitle.Visible = $false; $lblVpn1.Visible = $false
            $lblVpn2.Visible     = $false; $btnVPN.Visible  = $false
        }
        "ok" {
            $dotPanel.BackColor       = $acGreen; $dotPanel.Invalidate()
            $lblSt.ForeColor          = $acGreen
            $lblSt.Text               = "Connected  /  Server reachable"
            $btnERP.Tag["CP"]         = $colTeal
            $btnERP.Tag["FG"]         = $txHigh
            $btnERP.Tag["Active"]     = $true
            $btnERP.Invalidate()
            $lblVpnTitle.Visible = $false; $lblVpn1.Visible = $false
            $lblVpn2.Visible     = $false; $btnVPN.Visible  = $false
        }
        "fail" {
            $dotPanel.BackColor       = $acAmber; $dotPanel.Invalidate()
            $lblSt.ForeColor          = $acAmber
            $lblSt.Text               = "Cannot reach $($cfg.ERP_IP)  -  VPN required"
            $btnERP.Tag["CP"]         = $colGhost
            $btnERP.Tag["FG"]         = $txDim
            $btnERP.Tag["Active"]     = $false
            $btnERP.Invalidate()
            $lblVpn1.Text        = "Connection Name  :  $($cfg.VPN_NAME)"
            $lblVpn2.Text        = "VPN Server       :  $($cfg.VPN_SERVER)"
            $lblVpnTitle.Visible = $true; $lblVpn1.Visible = $true
            $lblVpn2.Visible     = $true; $btnVPN.Visible  = $true
        }
    }
    $form.Refresh()
}

function Do-Check {
    Set-Status "checking"
    if (Test-Server $cfg.ERP_IP) { Set-Status "ok" } else { Set-Status "fail" }
}

function Refresh-Labels {
    $lblURL.Text   = "http://$($cfg.ERP_IP):$($cfg.ERP_PORT)"
    $btnERP.Text   = "Open  $($cfg.ERP_NAME)"
    $lblTitle.Text = $cfg.ERP_NAME
    $form.Text     = $cfg.ERP_NAME
}

# ============================================================
# EVENTS
# ============================================================
$btnTC.Add_Click({ Switch-Tab "c" })
$btnTS.Add_Click({ Switch-Tab "s" })
$btnERP.Add_Click({
    param($s, $ea)
    if ($s.Tag["Active"]) { Start-Process "http://$($cfg.ERP_IP):$($cfg.ERP_PORT)" }
})
$btnVPN.Add_Click({ Start-Process "ms-settings:network-vpn" })
$lnkRecheck.Add_LinkClicked({ Do-Check })
$btnSave.Add_Click({
    foreach ($k in $txb.Keys) { $cfg[$k] = $txb[$k].Text.Trim() }
    Save-Config
    Refresh-Labels
    $lblSaveOK.Text = "Saved successfully"
    $t = New-Object System.Windows.Forms.Timer
    $t.Interval = 900
    $t.Add_Tick({ $t.Stop(); $lblSaveOK.Text = ""; Switch-Tab "c"; Do-Check })
    $t.Start()
})
$form.Add_Shown({ Do-Check })

[System.Windows.Forms.Application]::Run($form)
