# Ala-Too Digital Signature Platform - Development Startup Script
echo "Stopping existing containers..."
docker compose stop alatoo-db alatoo-cache alatoo-s3 alatoo-gotenberg

echo "Starting infrastructure (Postgres, Redis, MinIO, Gotenberg)..."
docker compose up -d alatoo-db alatoo-cache alatoo-s3 alatoo-gotenberg

echo "Waiting for Database to be ready..."
Start-Sleep -Seconds 10

echo "Starting Backend (Spring Boot)..."
cd backend
Start-Job -Name "backend" -ScriptBlock { 
    $env:DB_HOST="localhost"
    $env:REDIS_HOST="localhost"
    $env:DB_USERNAME="alatoo"
    $env:DB_PASSWORD="alatoo123"
    $env:JWT_SECRET="404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
    ./mvnw.cmd spring-boot:run -DskipTests 
}

echo "Starting Frontend (Next.js)..."
cd ../frontend
Start-Job -Name "frontend" -ScriptBlock { npm run dev }

echo "---------------------------------------------------"
echo "Ala-Too Sign is starting up!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8081"
echo "MinIO (Storage): http://localhost:9001 (admin/admin123)"
echo "---------------------------------------------------"
echo "Note: It may take 30-60 seconds for the backend to be fully ready."
