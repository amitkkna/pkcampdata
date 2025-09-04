@echo off

REM Development startup script for PKPPT Reports with Supabase

echo 🚀 Starting PKPPT Reports Development Environment
echo ================================================

REM Check if .env file exists
if not exist "server\.env" (
    echo ❌ Environment file not found!
    echo Please copy server\.env.example to server\.env and configure your Supabase credentials
    exit /b 1
)

echo ✅ Environment file found

REM Install dependencies if needed
if not exist "server\node_modules" (
    echo 📦 Installing server dependencies...
    cd server
    npm install
    cd ..
)

if not exist "client\node_modules" (
    echo 📦 Installing client dependencies...
    cd client
    npm install
    cd ..
)

echo ✅ Dependencies installed

REM Generate Prisma client
echo 🔧 Generating Prisma client...
cd server
npm run db:generate
cd ..

echo ✅ Prisma client generated

echo.
echo 🎯 Next steps:
echo 1. Make sure your Supabase project is set up
echo 2. Update server\.env with your Supabase credentials
echo 3. Run 'cd server ^&^& npm run db:migrate' to set up the database
echo 4. Run 'npm run dev' in both server and client directories
echo.
echo 📚 Check SUPABASE_MIGRATION.md for detailed setup instructions
echo.
echo Happy coding! 🎉
