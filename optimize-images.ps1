# Script d'optimisation d'images pour Windows
# Nécessite ImageMagick installé (https://imagemagick.org/script/download.php)

# Vérifier si ImageMagick est installé
if (-not (Get-Command magick -ErrorAction SilentlyContinue)) {
    Write-Host "ImageMagick n'est pas installé. Veuillez l'installer depuis https://imagemagick.org/script/download.php" -ForegroundColor Red
    exit 1
}

# Créer le dossier des images optimisées si nécessaire
$optimizedDir = "assets/images/optimized"
if (-not (Test-Path $optimizedDir)) {
    New-Item -ItemType Directory -Path $optimizedDir | Out-Null
}

# Liste des tailles d'images (largeur maximale en pixels)
$sizes = @{
    "small" = 400
    "medium" = 800
    "large" = 1200
    "xlarge" = 1600
}

# Fonction pour optimiser une image
function Optimize-Image {
    param (
        [string]$inputPath,
        [string]$outputDir,
        [string]$sizeName,
        [int]$maxWidth
    )
    
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($inputPath)
    $extension = [System.IO.Path]::GetExtension($inputPath).ToLower()
    $outputPath = Join-Path $outputDir "${fileName}_${sizeName}.webp"
    
    # Vérifier si le fichier de sortie existe déjà
    if (Test-Path $outputPath) {
        Write-Host "Le fichier $outputPath existe déjà. Ignoré." -ForegroundColor Yellow
        return
    }
    
    Write-Host "Optimisation de $inputPath en taille $sizeName..."
    
    # Commande d'optimisation avec ImageMagick
    & magick convert $inputPath -resize "${maxWidth}x>" -quality 80 -strip -auto-orient "$outputPath"
    
    if ($LASTEXITCODE -eq 0) {
        $originalSize = (Get-Item $inputPath).Length / 1KB
        $newSize = (Get-Item $outputPath).Length / 1KB
        $savings = 100 - (($newSize / $originalSize) * 100)
        
        Write-Host "  Taille originale: $([math]::Round($originalSize, 2)) KB" -ForegroundColor Gray
        Write-Host "  Nouvelle taille: $([math]::Round($newSize, 2)) KB" -ForegroundColor Green
        Write-Host "  Économisé: $([math]::Round($savings, 2))%" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de l'optimisation de $inputPath" -ForegroundColor Red
    }
}

# Traiter toutes les images dans le dossier assets
$imageExtensions = @("*.jpg", "*.jpeg", "*.png", "*.webp")
$imageFiles = Get-ChildItem -Path "assets" -Include $imageExtensions -Recurse -File | 
              Where-Object { $_.DirectoryName -notlike "*optimized*" }

foreach ($image in $imageFiles) {
    Write-Host "`nTraitement de $($image.FullName)" -ForegroundColor Cyan
    
    # Créer une version optimisée pour chaque taille
    foreach ($size in $sizes.GetEnumerator()) {
        Optimize-Image -inputPath $image.FullName -outputDir $optimizedDir -sizeName $size.Name -maxWidth $size.Value
    }
}

Write-Host "`nOptimisation terminée !" -ForegroundColor Green
