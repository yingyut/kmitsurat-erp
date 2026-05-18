Add-Type -AssemblyName System.Drawing

# ============================================================
# Generate icon.ico from KMIT official logo
# Sizes: 256x256, 48x48, 32x32, 16x16
# Design: KMIT K logo on white square + "ERP" badge
# ============================================================

$logoPath  = 'C:\Project\Kmit_ERP\kmit_logo.png'
$outputPath = 'C:\Project\Kmit_ERP\icon.ico'

if (-not (Test-Path $logoPath)) {
    Write-Host "[ERROR] Logo file not found: $logoPath"
    exit 1
}

$logo = [System.Drawing.Image]::FromFile($logoPath)
Write-Host "Logo loaded: $($logo.Width) x $($logo.Height) px"

# Crop just the K symbol (top 72% of logo, skip the "KMIT GROUP" text at bottom)
$cropH     = [int]($logo.Height * 0.72)
$cropBmp   = New-Object System.Drawing.Bitmap($logo.Width, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cropG     = [System.Drawing.Graphics]::FromImage($cropBmp)
$cropG.Clear([System.Drawing.Color]::White)
$srcRect   = New-Object System.Drawing.Rectangle(0, 0, $logo.Width, $cropH)
$dstRect   = New-Object System.Drawing.Rectangle(0, 0, $logo.Width, $cropH)
$cropG.DrawImage($logo, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$cropG.Dispose()
$logo.Dispose()

# ============================================================
# Build each icon size
# ============================================================
$iconSizes   = @(256, 48, 32, 16)
$pngDataList = [System.Collections.Generic.List[byte[]]]::new()

foreach ($sz in $iconSizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # White background
    $g.Clear([System.Drawing.Color]::White)

    # For 256 and 48: logo in top area + "ERP" text at bottom
    # For 32 and 16: logo fills entire square (text too small to read)
    if ($sz -ge 48) {
        $logoAreaH = [int]($sz * 0.74)   # top 74% for logo
        $erpAreaY  = [int]($sz * 0.76)   # bottom 24% for ERP text
        $erpAreaH  = $sz - $erpAreaY

        # Scale logo to fit top area (maintain aspect ratio, center horizontally)
        $logoAspect = $cropBmp.Width / [double]$cropBmp.Height
        $fitH = $logoAreaH
        $fitW = [int]($fitH * $logoAspect)
        if ($fitW -gt $sz) { $fitW = $sz; $fitH = [int]($fitW / $logoAspect) }
        $logoX = [int](($sz - $fitW) / 2)
        $logoY = [int](($logoAreaH - $fitH) / 2)

        $g.DrawImage($cropBmp, $logoX, $logoY, $fitW, $fitH)

        # Separator line
        $sepColor = [System.Drawing.Color]::FromArgb(180, 200, 200, 200)
        $sepPen   = New-Object System.Drawing.Pen($sepColor, 1)
        $g.DrawLine($sepPen, ([int]($sz*0.1)), ($erpAreaY - 2), ([int]($sz*0.9)), ($erpAreaY - 2))
        $sepPen.Dispose()

        # "ERP" text (teal color matching logo's teal arrow)
        $fontSize  = [float]([math]::Max(6, $sz * 0.22))
        $fontERP   = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $erpBrush  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 140, 140))
        $sf        = New-Object System.Drawing.StringFormat
        $sf.Alignment     = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $rectERP   = New-Object System.Drawing.RectangleF(0, $erpAreaY, $sz, $erpAreaH)
        $g.DrawString("ERP", $fontERP, $erpBrush, $rectERP, $sf)
        $fontERP.Dispose()
        $erpBrush.Dispose()
    } else {
        # 32 and 16: just scale logo to fill square
        $logoAspect = $cropBmp.Width / [double]$cropBmp.Height
        $fitW = $sz; $fitH = [int]($sz / $logoAspect)
        if ($fitH -gt $sz) { $fitH = $sz; $fitW = [int]($sz * $logoAspect) }
        $logoX = [int](($sz - $fitW) / 2)
        $logoY = [int](($sz - $fitH) / 2)
        $g.DrawImage($cropBmp, $logoX, $logoY, $fitW, $fitH)
    }

    $g.Dispose()

    $pngMs = New-Object System.IO.MemoryStream
    $bmp.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngDataList.Add($pngMs.ToArray())
    $pngMs.Dispose()
    $bmp.Dispose()
}
$cropBmp.Dispose()

# ============================================================
# Write ICO binary (ICONDIR + ICONDIRENTRY*n + PNG data)
# ============================================================
$outMs = New-Object System.IO.MemoryStream
$bw    = New-Object System.IO.BinaryWriter($outMs)

$count = $iconSizes.Count
$bw.Write([System.UInt16]0)       # Reserved
$bw.Write([System.UInt16]1)       # Type = ICO
$bw.Write([System.UInt16]$count)  # Image count

$dataOffset = [System.UInt32](6 + 16 * $count)
for ($i = 0; $i -lt $count; $i++) {
    $sz = $iconSizes[$i]
    $icoSize = [byte]$(if ($sz -ge 256) { 0 } else { $sz })
    $bw.Write($icoSize)                                       # Width  (0 = 256)
    $bw.Write($icoSize)                                       # Height (0 = 256)
    $bw.Write([byte]0)                                        # ColorCount
    $bw.Write([byte]0)                                        # Reserved
    $bw.Write([System.UInt16]1)                               # Planes
    $bw.Write([System.UInt16]32)                              # BitCount
    $bw.Write([System.UInt32]$pngDataList[$i].Length)         # BytesInRes
    $bw.Write([System.UInt32]$dataOffset)                     # ImageOffset
    $dataOffset += [System.UInt32]$pngDataList[$i].Length
}
foreach ($data in $pngDataList) {
    $bw.Write($data, 0, $data.Length)
}

$bw.Flush()
[System.IO.File]::WriteAllBytes($outputPath, $outMs.ToArray())
$bw.Dispose()
$outMs.Dispose()

Write-Host "icon.ico created: $outputPath"
Write-Host "Sizes: $($iconSizes -join ', ') px  |  File: $([math]::Round((Get-Item $outputPath).Length/1KB,1)) KB"
