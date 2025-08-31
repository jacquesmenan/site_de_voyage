# Script pour minifier les fichiers CSS et JavaScript
# Nécessite Node.js et les paquets npm : uglify-js, clean-css-cli

# Vérifier si Node.js est installé
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Installer les dépendances si nécessaires
$dependencies = @("uglify-js", "clean-css-cli")

foreach ($dep in $dependencies) {
    if (-not (Test-Path "node_modules/$dep")) {
        Write-Host "Installation de $dep..." -ForegroundColor Cyan
        npm install $dep --save-dev
    }
}

# Fonction pour minifier les fichiers JavaScript
function Minify-JavaScript {
    param (
        [string]$inputFile,
        [string]$outputFile
    )
    
    Write-Host "Minification de $inputFile..." -ForegroundColor Cyan
    npx uglifyjs "$inputFile" --compress --mangle -o "$outputFile"
    
    if ($LASTEXITCODE -eq 0) {
        $originalSize = (Get-Item $inputFile).Length / 1KB
        $newSize = (Get-Item $outputFile).Length / 1KB
        $savings = 100 - (($newSize / $originalSize) * 100)
        
        Write-Host "  Taille originale: $([math]::Round($originalSize, 2)) KB" -ForegroundColor Gray
        Write-Host "  Nouvelle taille: $([math]::Round($newSize, 2)) KB" -ForegroundColor Green
        Write-Host "  Économisé: $([math]::Round($savings, 2))%" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de la minification de $inputFile" -ForegroundColor Red
    }
}

# Minifier les fichiers JavaScript
$jsFiles = @(
    @{Input="assets/js/main.js"; Output="assets/js/main.min.js"},
    @{Input="assets/js/contact.js"; Output="assets/js/contact.min.js"},
    @{Input="assets/js/paiement.js"; Output="assets/js/paiement.min.js"}
)

foreach ($file in $jsFiles) {
    if (Test-Path $file.Input) {
        Minify-JavaScript -inputFile $file.Input -outputFile $file.Output
    } else {
        Write-Host "Fichier introuvé: $($file.Input)" -ForegroundColor Yellow
    }
}

Write-Host "`nMinification terminée !" -ForegroundColor Green
