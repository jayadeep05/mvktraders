$ErrorActionPreference = "Stop"

$toolsDir = "$PSScriptRoot\tools"
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

# URLs
$jdkUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
$mavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.5/binaries/apache-maven-3.9.5-bin.zip"

# Paths
$jdkZip = "$toolsDir\jdk.zip"
$mavenZip = "$toolsDir\maven.zip"
$jdkDest = "$toolsDir\jdk"
$mavenDest = "$toolsDir\maven"

# Download JDK
if (-not (Test-Path "$jdkDest\bin\java.exe")) {
    Write-Host "Downloading JDK 17..."
    Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip
    
    Write-Host "Extracting JDK..."
    Expand-Archive -Path $jdkZip -DestinationPath $toolsDir -Force
    
    # Rename extracted folder (it usually has a versioned name) to 'jdk'
    $extractedJdk = Get-ChildItem -Path $toolsDir -Directory | Where-Object { $_.Name -like "jdk-17*" } | Select-Object -First 1
    if ($extractedJdk) {
        Rename-Item -Path $extractedJdk.FullName -NewName "jdk"
    }
    Remove-Item $jdkZip
} else {
    Write-Host "JDK already installed."
}

# Download Maven
if (-not (Test-Path "$mavenDest\bin\mvn.cmd")) {
    Write-Host "Downloading Maven..."
    Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip
    
    Write-Host "Extracting Maven..."
    Expand-Archive -Path $mavenZip -DestinationPath $toolsDir -Force
    
    # Rename extracted folder
    $extractedMaven = Get-ChildItem -Path $toolsDir -Directory | Where-Object { $_.Name -like "apache-maven*" } | Select-Object -First 1
    if ($extractedMaven) {
        Rename-Item -Path $extractedMaven.FullName -NewName "maven"
    }
    Remove-Item $mavenZip
} else {
    Write-Host "Maven already installed."
}

Write-Host "Setup complete."
