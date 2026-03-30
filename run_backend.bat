@echo off
set "JAVA_HOME=C:\PROGRA~1\Java\jdk-21"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo Using JAVA_HOME: %JAVA_HOME%
java -version
cd backend
mvnw.cmd spring-boot:run -DskipTests
