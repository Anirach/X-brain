# X-Brain Knowledge Graph AI Agent System

A sophisticated AI agent system that integrates Graphiti as a temporal knowledge graph engine to empower AI agents to reason over time-evolving knowledge. Built with Python FastAPI backend, Neo4j graph database, OpenAI API integration, and React TypeScript frontend with D3.js visualization.

## 🚀 Features

- **Temporal Knowledge Graphs**: Store and reason over time-evolving information using Graphiti
- **Document Processing**: Upload and parse PDF/TXT documents with entity extraction
- **RAG-Enabled Chat**: Intelligent chatbot with retrieval-augmented generation
- **Interactive Visualization**: D3.js-powered graph visualization with temporal exploration
- **Multi-Graph Management**: Support for multiple knowledge graph instances
- **Real-time Processing**: Background document processing with status tracking

## 🏗️ Architecture

```
Frontend (React + TypeScript)
├── Document Loader Tab
├── Chat Interface Tab  
├── Graph Visualization Tab
└── Graph Management

Backend (Python + FastAPI)
├── Document Processing Service
├── RAG Service
├── Graph Management API
└── Visualization API

Knowledge Graph Layer
├── Graphiti (Temporal Graph Engine)
├── Neo4j (Graph Database)
└── OpenAI (LLM + Embeddings)
```

## 📋 Prerequisites

- Python >= 3.10
- Node.js >= 16
- Neo4j >= 5.26
- OpenAI API key

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd X-brain
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Neo4j Setup
```bash
# Using Docker (recommended)
docker run \
    --name neo4j \
    -p7474:7474 -p7687:7687 \
    -d \
    -v $HOME/neo4j/data:/data \
    -v $HOME/neo4j/logs:/logs \
    -v $HOME/neo4j/import:/var/lib/neo4j/import \
    -v $HOME/neo4j/plugins:/plugins \
    --env NEO4J_AUTH=neo4j/your_password \
    neo4j:5.26
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
NEO4J_DATABASE=neo4j

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads
```

## 🚀 Running the Application

### Start Backend Server
```bash
# Activate virtual environment
source venv/bin/activate

# Run FastAPI server
python main.py

# Or with uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend Development Server
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📚 Usage

### 1. Create a Knowledge Graph
1. Navigate to the home page
2. Click "Create New Graph" 
3. Enter a name and description
4. Your new graph will be automatically selected

### 2. Upload Documents
1. Go to the "Document Loader" tab
2. Select your knowledge graph
3. Upload PDF or TXT files
4. Monitor processing status
5. Documents will be processed and added to the graph

### 3. Chat with Your Knowledge
1. Open the "Chat Interface" tab
2. Ensure a graph is selected
3. Ask questions about your documents
4. The AI will use graph context to provide informed answers

### 4. Visualize Your Graph
1. Visit the "Graph Visualization" tab
2. Explore your knowledge graph interactively
3. Filter by time, node types, or relationships
4. Click nodes to see details

## 🔌 API Endpoints

### Graph Management
- `GET /api/graphs/list` - List all graphs
- `POST /api/graphs/create` - Create new graph
- `GET /api/graphs/{graph_id}` - Get graph details
- `DELETE /api/graphs/{graph_id}` - Delete graph

### Document Processing
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/status/{document_id}` - Check processing status
- `GET /api/documents/list/{graph_id}` - List documents in graph

### Chat Interface
- `POST /api/chat/message` - Send chat message
- `GET /api/chat/sessions` - List chat sessions
- `POST /api/chat/search` - Search graph

### Visualization
- `POST /api/visualizations/graph-data` - Get visualization data
- `POST /api/visualizations/timeline` - Get timeline data
- `GET /api/visualizations/subgraph/{graph_id}` - Get subgraph

## 🧪 Testing

### Backend Tests
```bash
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🔍 Troubleshooting

### Common Issues

1. **Neo4j Connection Failed**
   - Ensure Neo4j is running on the correct port
   - Check username/password in .env file
   - Verify network connectivity

2. **OpenAI API Errors**
   - Validate API key is correct
   - Check API quota and billing
   - Ensure model names are correct

3. **File Upload Issues**
   - Check file size limits
   - Ensure upload directory exists and is writable
   - Verify file type is supported (PDF/TXT)

4. **Graph Processing Slow**
   - Consider reducing document chunk size
   - Check Neo4j performance and memory
   - Monitor OpenAI API rate limits

## 📈 Performance Tips

1. **Optimize Neo4j**
   - Increase memory allocation
   - Create appropriate indexes
   - Use graph algorithms for large datasets

2. **Batch Processing**
   - Process multiple documents in parallel
   - Use background tasks for heavy operations
   - Implement caching for repeated queries

3. **Frontend Optimization**
   - Limit visualization node count
   - Implement pagination for large result sets
   - Use debouncing for search queries

## 🛣️ Roadmap

- [ ] User authentication and authorization
- [ ] Advanced graph analytics
- [ ] Export to RDF/GraphQL
- [ ] Custom entity types and relationships
- [ ] Real-time collaborative editing
- [ ] Mobile responsive design
- [ ] Integration with more document formats
- [ ] Advanced temporal queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Graphiti](https://github.com/getzep/graphiti) - Temporal knowledge graph engine
- [Neo4j](https://neo4j.com/) - Graph database platform
- [OpenAI](https://openai.com/) - AI models and embeddings
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - Frontend library
- [D3.js](https://d3js.org/) - Data visualization library
