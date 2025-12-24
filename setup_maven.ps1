$ErrorActionPreference = "Stop"
$toolsDir = "$PSScriptRoot\tools"
$mavenZip = "$toolsDir\maven.zip"
$mavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"

if (-not (Test-Path "$toolsDir\maven")) {
    Write-Host "Downloading Maven from Archive..."
    # Force TLS 1.2
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip
    
    Write-Host "Extracting Maven..."
    Expand-Archive -Path $mavenZip -DestinationPath $toolsDir -Force
    
    $extracted = Get-ChildItem -Path $toolsDir -Directory | Where-Object { $_.Name -like "apache-maven*" } | Select-Object -First 1
    if ($extracted) {
        Rename-Item -Path $extracted.FullName -NewName "maven"
    }
    else {
        Write-Error "Extraction failed or folder not found"
    }
    Remove-Item $mavenZip
    Write-Host "Maven setup complete."
}
else {
    Write-Host "Maven already exists."
}
