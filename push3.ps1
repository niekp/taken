$ErrorActionPreference = "Stop"
$token = "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"
$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

$baseDir = "Z:\Dev\Opencode\Planner"

Write-Host "=== Pushen naar GitHub ===" -ForegroundColor Cyan

function Get-FileContentBase64($path) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    return [Convert]::ToBase64String($bytes)
}

$files = @()
$basePath = "$baseDir\divide-chores"

Get-ChildItem -Path $basePath -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Replace($basePath, "").Replace("\", "/").TrimStart("/")
    if ($relativePath -and $relativePath -notmatch "^\.env$" -and $relativePath -notmatch "^push") {
        $files += @{
            path = $relativePath
            content = Get-FileContentBase64 $_.FullName
        }
    }
}

Write-Host "1. Upload $($files.Count) bestanden..." -ForegroundColor Yellow

$blobs = @{}
foreach ($file in $files) {
    $blobUrl = "https://api.github.com/repos/bijanamirhojat/divide-chores/git/blobs"
    $blobBody = @{
        content = $file.content
        encoding = "base64"
    } | ConvertTo-Json -Depth 10
    
    $blob = Invoke-RestMethod -Uri $blobUrl -Method Post -Headers $headers -Body $blobBody -ContentType "application/json"
    $blobs[$file.path] = $blob.sha
    Write-Host "   $($file.path)" -ForegroundColor Gray
}

Write-Host "   Klaar!" -ForegroundColor Green

Write-Host "2. Tree maken..." -ForegroundColor Yellow
$treeItems = @()
foreach ($file in $files) {
    $treeItems += @{
        path = $file.path
        mode = "100644"
        type = "blob"
        sha = $blobs[$file.path]
    }
}

$treeBody = @{ tree = $treeItems } | ConvertTo-Json -Depth 10
$treeUrl = "https://api.github.com/repos/bijanamirhojat/divide-chores/git/trees"
$tree = Invoke-RestMethod -Uri $treeUrl -Method Post -Headers $headers -Body $treeBody -ContentType "application/json"

Write-Host "   Tree: $($tree.sha)" -ForegroundColor Green

Write-Host "3. Eerste commit maken..." -ForegroundColor Yellow
$date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$commitBody = @{
    message = "First commit - Divide/Chores app"
    author = @{ name = "Bijan"; email = "b@test.com"; date = $date }
    tree = $tree.sha
} | ConvertTo-Json

$commitUrl = "https://api.github.com/repos/bijanamirhojat/divide-chores/git/commits"
$commit = Invoke-RestMethod -Uri $commitUrl -Method Post -Headers $headers -Body $commitBody -ContentType "application/json"

Write-Host "   Commit: $($commit.sha.Substring(0,7))" -ForegroundColor Green

Write-Host "4. Branch aanmaken..." -ForegroundColor Yellow
$refBody = @{ ref = "refs/heads/main"; sha = $commit.sha } | ConvertTo-Json
$refUrl = "https://api.github.com/repos/bijanamirhojat/divide-chores/git/refs"
Invoke-RestMethod -Uri $refUrl -Method Post -Headers $headers -Body $refBody -ContentType "application/json" | Out-Null

Write-Host ""
Write-Host "=== SUCCESS! ===" -ForegroundColor Green
Write-Host "Code is gepusht naar GitHub." -ForegroundColor Green
Write-Host ""
Write-Host "Nu GitHub Pages activeren:" -ForegroundColor Cyan
Write-Host "1. Ga naar: https://github.com/bijanamirhojat/divide-chores/settings/pages" -ForegroundColor White
Write-Host "2. Select 'Deploy from main branch'" -ForegroundColor White  
Write-Host "3. Wacht 1-2 minuten" -ForegroundColor White
Write-Host "4. App is live!" -ForegroundColor White
