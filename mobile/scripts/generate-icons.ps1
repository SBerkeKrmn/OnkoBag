# OnkoBağ uygulama ikonlarını üretir: iç içe geçmiş mor (tedavideki) ve yeşil
# (iyileşen) halka. Proje web sitesindeki logoyla aynı geometri (56 birimlik ızgara):
#   mor halka merkez (17.4, 20), yeşil halka merkez (38.6, 20), yarıçap 14.6, kalınlık 5.6
#   üst kesişimde mor halka yeşilin üzerinden geçer (iç içe görünüm)
# Çalıştırma (mobile klasöründe):  powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
Add-Type -AssemblyName System.Drawing

$Lavender = [System.Drawing.ColorTranslator]::FromHtml('#6D5BD0')
$Sage = [System.Drawing.ColorTranslator]::FromHtml('#3E9C7A')
$Tint = [System.Drawing.ColorTranslator]::FromHtml('#EFEBFF')
$assets = Join-Path $PSScriptRoot '..\assets'

function New-Canvas([int]$size, $background) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  if ($background) { $g.Clear($background) } else { $g.Clear([System.Drawing.Color]::Transparent) }
  return @($bmp, $g)
}

# Logoyu tuvalin ortasına, genişliği logoWidth piksel olacak şekilde çizer
function Draw-Logo($g, [int]$size, [double]$logoWidth, $left = $Lavender, $right = $Sage) {
  $k = $logoWidth / 56.0
  $ox = ($size - 56 * $k) / 2
  $oy = ($size - 40 * $k) / 2
  $r = 14.6 * $k
  $w = 5.6 * $k
  $lp = New-Object System.Drawing.Pen $left, $w
  $rp = New-Object System.Drawing.Pen $right, $w
  $lRect = New-Object System.Drawing.RectangleF ([single]($ox + 17.4 * $k - $r)), ([single]($oy + 20 * $k - $r)), ([single](2 * $r)), ([single](2 * $r))
  $rRect = New-Object System.Drawing.RectangleF ([single]($ox + 38.6 * $k - $r)), ([single]($oy + 20 * $k - $r)), ([single](2 * $r)), ([single](2 * $r))
  $g.DrawEllipse($lp, $lRect)
  $g.DrawEllipse($rp, $rRect)
  # Üst kesişim: mor halka yeşilin üstünden geçer
  $g.DrawArc($lp, $lRect, -66, 44)
  $lp.Dispose(); $rp.Dispose()
}

function Save($pair, [string]$name) {
  $pair[1].Dispose()
  $path = Join-Path $assets $name
  $pair[0].Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $pair[0].Dispose()
  Write-Output "  $name"
}

Write-Output 'Ikonlar uretiliyor:'

# iOS / genel ikon: saydamlık olmamalı (App Store kuralı); açık lavanta zemin
$c = New-Canvas 1024 $Tint; Draw-Logo $c[1] 1024 640; Save $c 'icon.png'

# Android uyarlanabilir ikon: ön plan saydam, logo merkezdeki güvenli alanda (çapın ~%66'sı)
$c = New-Canvas 1024 $null; Draw-Logo $c[1] 1024 560; Save $c 'android-icon-foreground.png'
$c = New-Canvas 1024 $Tint; Save $c 'android-icon-background.png'
# Tek renkli (Android 13+ temalı ikon): sistem rengini kendisi uygular
$black = [System.Drawing.Color]::Black
$c = New-Canvas 1024 $null; Draw-Logo $c[1] 1024 560 $black $black; Save $c 'android-icon-monochrome.png'

# Açılış ekranı ve web
$c = New-Canvas 1024 $null; Draw-Logo $c[1] 1024 600; Save $c 'splash-icon.png'
$c = New-Canvas 48 $null; Draw-Logo $c[1] 48 44; Save $c 'favicon.png'
