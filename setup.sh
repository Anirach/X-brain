#!/bin/bash

echo "🚀 Setting up X-Brain Knowledge Graph AI Agent System"
echo "=================================================="

# Check Python version
python_version=$(python3 --version 2>&1 | grep -o '[0-9]\+\.[0-9]\+' | head -1)
required_version="3.10"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" = "$required_version" ]; then 
    echo "✅ Python $python_version is compatible"
else
    echo "❌ Python $python_version is not compatible. Please install Python 3.10 or higher"
    exit 1
fi

# Check Node.js version
if command -v node &> /dev/null; then
    node_version=$(node --version | grep -o '[0-9]\+' | head -1)
    if [ "$node_version" -ge 16 ]; then
        echo "✅ Node.js $(node --version) is compatible"
    else
        echo "❌ Node.js version is too old. Please install Node.js 16 or higher"
        exit 1
    fi
else
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher"
    exit 1
fi

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create environment file
if [ ! -f .env ]; then
    echo "⚙️ Creating environment configuration..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration:"
    echo "   - OPENAI_API_KEY"
    echo "   - NEO4J_PASSWORD"
    echo "   - Other settings as needed"
fi

# Create upload directory
echo "📁 Creating upload directory..."
mkdir -p uploads

# Install frontend dependencies
echo "🎨 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🚀 Next steps:"
echo "1. Start Neo4j database:"
echo "   docker run --name neo4j -p7474:7474 -p7687:7687 -d -v \$HOME/neo4j/data:/data --env NEO4J_AUTH=neo4j/your_password neo4j:5.26"
echo ""
echo "2. Configure your .env file with:"
echo "   - OpenAI API key"
echo "   - Neo4j password"
echo ""
echo "3. Start the backend server:"
echo "   source venv/bin/activate"
echo "   python main.py"
echo ""
echo "4. Start the frontend (in another terminal):"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "5. Access the application at http://localhost:3000"
echo ""
echo "📚 Read README.md for detailed documentation"
