#!/bin/bash

# Development startup script for PKPPT Reports with Supabase

echo "🚀 Starting PKPPT Reports Development Environment"
echo "================================================"

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "❌ Environment file not found!"
    echo "Please copy server/.env.example to server/.env and configure your Supabase credentials"
    exit 1
fi

echo "✅ Environment file found"

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

echo "✅ Dependencies installed"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd server && npm run db:generate && cd ..

echo "✅ Prisma client generated"

echo ""
echo "🎯 Next steps:"
echo "1. Make sure your Supabase project is set up"
echo "2. Update server/.env with your Supabase credentials"
echo "3. Run 'cd server && npm run db:migrate' to set up the database"
echo "4. Run 'npm run dev' in both server and client directories"
echo ""
echo "📚 Check SUPABASE_MIGRATION.md for detailed setup instructions"
echo ""
echo "Happy coding! 🎉"
