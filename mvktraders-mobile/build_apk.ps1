$env:JAVA_HOME = "C:\Program Files\Java\jdk-20"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

Write-Host "=========================================="
Write-Host "       STARTING ANDROID BUILD (EXPLICIT)"
Write-Host "=========================================="

# Ensure we are in the script's directory
Set-Location $PSScriptRoot

if (Test-Path "android") {
    cd android
} elseif (!(Test-Path "gradlew.bat")) {
    Write-Error "Could not find android directory or gradlew.bat"
    exit 1
}

Write-Host "Running Gradle CLEAN (:app:clean)..."
cmd /c "gradlew.bat :app:clean"

Write-Host "------------------------------------------"
Write-Host "Running Gradle ASSEMBLE_RELEASE (:app:assembleRelease)..."
cmd /c "gradlew.bat :app:assembleRelease"

Write-Host "=========================================="
Write-Host "       BUILD FINISHED"
Write-Host "=========================================="
