Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile('c:\dev\serventica-app\apps\customer\src\assets\images\serventica-hero-gardener.png')
$targetWidth = 720
$targetHeight = [int]($src.Height * ($targetWidth / $src.Width))

$dest = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$graphics = [System.Drawing.Graphics]::FromImage($dest)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($src, 0, 0, $targetWidth, $targetHeight)

$dest.Save('c:\dev\serventica-app\apps\customer\src\assets\images\serventica-hero-gardener-opt.png', [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$dest.Dispose()
$src.Dispose()

$file = Get-Item 'c:\dev\serventica-app\apps\customer\src\assets\images\serventica-hero-gardener-opt.png'
Write-Host "Created mobile optimized image: $($file.Length) bytes ($targetWidth x $targetHeight)"
