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
    if ($relativePath -and $relativePath -notmatch "^\.env$" -and $relativePath -notmatch "^push\.") {
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
    
    try {
        $blob = Invoke-RestMethod -Uri $blobUrl -Method Post -Headers $headers -Body $blobBody -ContentType "application/json"
        $blobs[$file.path] = $blob.sha
    } catch {
        Write-Host "   Fout bij $($file.path): $_" -ForegroundColor Red
    }
}

$treeItems = @()
foreach ($file in $files) {
    if ($blobs[$file.path]) {
        $treeItems += @{
            path = $file.path
            mode = "100644"
            type = "blob"
            sha = $blobs[$file.path]
        }
    }
}

$treeBody = @{ tree = $treeItems } | ConvertTo-Json -Depth 10
$treeUrl = "https://api.github.com/repos/bijanamirhojat/divide-chores/git/trees"
$treeBody = @{ 
    tree = $treeItems
    base_tree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
} | ConvertTo-Json -Depth 10

try {
    $tree = Invoke-RestMethod -Uri $treeUrl -Method Post -Headers $headers -Body $treeBody -ContentType "application/json"
    Write-Host "   Tree gemaakt" -ForegroundColor Green
} catch {
    Write-Host "   Fout bij tree: $_" -ForegroundColor Red
    Write-Host $treeBody
    exit 1
}

$date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$commitBody = @{
    message = "First commit"
    author = @{ name = "Bijan"; email = "b@test.com"; date = $date }
    tree = $tree.sha
} | ConvertTo-Json

$commitUrl = "https://api.github.com/repos/bijanamirhojat/divide-chores/git/commits"
$commit = Invoke-RestMethod -Uri $commitUrl -Method Post -Headers $headers -Body $commitBody -ContentType "application/json"

$refBody = @{ sha = $commit.sha; force = $true } | ConvertTo-Json
$refUrl = "https://api.github.com/repos/bijanamirhojat/divide-chores/git/refs/heads/main"
Invoke-RestMethod -Uri $refUrl -Method Patch -Headers $headers -Body $refBody -ContentType "application/json" | Out-Null

Write-Host "Klaar!" -ForegroundColor Green
