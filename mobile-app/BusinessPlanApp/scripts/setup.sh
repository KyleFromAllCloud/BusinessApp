#!/bin/bash

# Business Plan App Setup Script
echo "🚀 Setting up Business Plan Mobile App..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the BusinessPlanApp directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install iOS dependencies if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Installing iOS dependencies..."
    cd ios && pod install && cd ..
fi

# Check if agentcore is running
echo "🔍 Checking agentcore connection..."
if curl -s http://localhost:8080/ping > /dev/null; then
    echo "✅ Agentcore backend is running on localhost:8080"
else
    echo "⚠️  Warning: Agentcore backend not found on localhost:8080"
    echo "   Please make sure your agentcore backend is running"
    echo "   You can start it with: cd ../../ && python -m uvicorn app.agentcore_runtime:app --host 0.0.0.0 --port 8080"
fi

echo "✅ Setup complete!"
echo ""
echo "📱 To run the app:"
echo "   iOS: npx react-native run-ios"
echo "   Android: npx react-native run-android"
echo ""
echo "🔧 To start the agentcore backend:"
echo "   cd ../../ && python -m uvicorn app.agentcore_runtime:app --host 0.0.0.0 --port 8080"
