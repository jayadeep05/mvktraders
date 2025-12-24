$env:JAVA_HOME = "$PSScriptRoot\tools\jdk"
$env:PATH = "$env:JAVA_HOME\bin;$PSScriptRoot\tools\maven\bin;$env:PATH"

Write-Host "Starting Backend with:"
Write-Host "JAVA_HOME: $env:JAVA_HOME"
mvn -v

cd "$PSScriptRoot\backend"
mvn clean package -DskipTests
java -jar target/investment-analytics-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev
