$env:JAVA_HOME = "C:\Program Files\Java\jdk-20"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

Write-Host "Building RELEASE APK with Injected Signing Config..."
cd android

# Use absolute path for keystore to avoid confusion
$keystorePath = Join-Path (Get-Location) "app\release.keystore"
# Escape backslashes for Java/Gradle if necessary, but usually forward slashes work best in Gradle props
$keystorePath = $keystorePath -replace "\\", "/"
Write-Host "Keystore Path: $keystorePath"

# Run Gradle with arguments all on one logical line to avoid PowerShell parsing errors
cmd /c "gradlew.bat assembleRelease -Pandroid.injected.signing.store.file=""$keystorePath"" -Pandroid.injected.signing.store.password=password -Pandroid.injected.signing.key.alias=mvk-key -Pandroid.injected.signing.key.password=password"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build Success!"
    Write-Host "APK Location: android\app\build\outputs\apk\release\app-release.apk"
} else {
    Write-Host "❌ Build Failed."
}
