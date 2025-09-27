@echo off
echo ========================================
echo   CapRover Deployment Preparation
echo ========================================
echo.

echo Cleaning up old files...
if exist "deploy.zip" del "deploy.zip"

echo.
echo Installing production dependencies...
call npm ci --only=production

echo.
echo Generating Prisma client...
call npx prisma generate

echo.
echo Creating deployment package...
powershell -Command "Compress-Archive -Path * -DestinationPath deploy.zip -Force"

echo.
echo ========================================
echo   Deployment package ready!
echo ========================================
echo.
echo Upload 'deploy.zip' to your CapRover app
echo.
pause