Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap('c:\dev\serventica-app\apps\customer\src\assets\images\serventica-hero-gardener.png')
Write-Host "Dimensions: $($bmp.Width) x $($bmp.Height)"

$colors = @()
for ($y = 0; $y -lt [int]($bmp.Height * 0.35); $y += 10) {
    for ($x = 0; $x -lt $bmp.Width; $x += 10) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.R -gt 240 -and $p.G -gt 240 -and $p.B -gt 240) { continue }
        if ($p.R -lt 20 -and $p.G -lt 20 -and $p.B -lt 20) { continue }
        $colors += $p
    }
}
Write-Host "Sampled $($colors.Count) pixels."

$greens = @()
$warm = @()
foreach ($c in $colors) {
    if ($c.G -gt $c.R -and $c.G -gt $c.B) {
        $greens += $c
    } elseif ($c.R -gt $c.B -and $c.G -gt $c.B) {
        $warm += $c
    }
}
Write-Host "Greens: $($greens.Count), Warm: $($warm.Count)"

$avgR = [int](($greens | Measure-Object -Property R -Average).Average)
$avgG = [int](($greens | Measure-Object -Property G -Average).Average)
$avgB = [int](($greens | Measure-Object -Property B -Average).Average)

Write-Host ("Average Dominant Green: RGB({0},{1},{2}) / #{0:X2}{1:X2}{2:X2}" -f $avgR, $avgG, $avgB)

# Sort greens by luminance to get deep green and lighter green for gradient
$sortedGreens = $greens | Sort-Object { 0.299 * $_.R + 0.587 * $_.G + 0.114 * $_.B }
$deepGreen = $sortedGreens[[int]($sortedGreens.Count * 0.25)]
$midGreen = $sortedGreens[[int]($sortedGreens.Count * 0.50)]
$lightGreen = $sortedGreens[[int]($sortedGreens.Count * 0.75)]

Write-Host ("Deep Green (Gradient Start): #{0:X2}{1:X2}{2:X2}" -f $deepGreen.R, $deepGreen.G, $deepGreen.B)
Write-Host ("Mid Green (Primary Color): #{0:X2}{1:X2}{2:X2}" -f $midGreen.R, $midGreen.G, $midGreen.B)
Write-Host ("Light Green (Gradient End): #{0:X2}{1:X2}{2:X2}" -f $lightGreen.R, $lightGreen.G, $lightGreen.B)

$bmp.Dispose()
