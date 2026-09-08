Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap('c:\dev\serventica-app\apps\customer\src\assets\images\serventica-hero-gardener.png')

$colors = @()
# Sample across the entire foliage, apron, cap, and garden (0% to 75% height)
for ($y = 0; $y -lt [int]($bmp.Height * 0.75); $y += 8) {
    for ($x = 0; $x -lt $bmp.Width; $x += 8) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.R -gt 245 -and $p.G -gt 245 -and $p.B -gt 245) { continue }
        if ($p.R -lt 15 -and $p.G -lt 15 -and $p.B -lt 15) { continue }
        $colors += $p
    }
}

$greens = @()
foreach ($c in $colors) {
    # Garden green: G >= R and G >= B, and significant green saturation
    if ($c.G -gt $c.R -and $c.G -gt $c.B -and ($c.G - [Math]::Max($c.R, $c.B)) -ge 12) {
        $greens += $c
    }
}
Write-Host "Total foliage and gardener green pixels sampled: $($greens.Count)"

$sortedGreens = $greens | Sort-Object { 0.299 * $_.R + 0.587 * $_.G + 0.114 * $_.B }
$deepGreen = $sortedGreens[[int]($sortedGreens.Count * 0.20)]
$midGreen = $sortedGreens[[int]($sortedGreens.Count * 0.50)]
$lightGreen = $sortedGreens[[int]($sortedGreens.Count * 0.80)]

Write-Host ("Deep Green (Gradient Start): #{0:X2}{1:X2}{2:X2} - RGB({0},{1},{2})" -f $deepGreen.R, $deepGreen.G, $deepGreen.B)
Write-Host ("Mid Green (Primary Color): #{0:X2}{1:X2}{2:X2} - RGB({0},{1},{2})" -f $midGreen.R, $midGreen.G, $midGreen.B)
Write-Host ("Light Green (Gradient End): #{0:X2}{1:X2}{2:X2} - RGB({0},{1},{2})" -f $lightGreen.R, $lightGreen.G, $lightGreen.B)

$bmp.Dispose()
