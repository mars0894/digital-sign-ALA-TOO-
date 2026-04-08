@echo off
java -version
cd backend
mvnw.cmd spring-boot:run -DskipTests
