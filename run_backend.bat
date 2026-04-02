@echo off
set "JAVA_HOME=C:\PROGRA~1\Java\jdk-21"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo Using JAVA_HOME: %JAVA_HOME%

:: Load environments from .env file
if exist .env (
    echo Loading variables from .env...
    for /f "usebackq tokens=1* delims==" %%A in (".env") do (
        set "%%A=%%B"
    )
)

cd backend
call mvnw.cmd spring-boot:run -DskipTests
