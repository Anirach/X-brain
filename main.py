f the from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from dotenv import load_dotenv

from app.routers import documents, chat, graphs, visualizations
from app.core.config import settings
from app.core.database import neo4j_driver
from app.core.graphiti_client import GraphitiClient

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Knowledge Graph AI Agent System",
    description="Temporal knowledge graph system with AI agents",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(graphs.router, prefix="/api/graphs", tags=["graphs"])
app.include_router(visualizations.router, prefix="/api/visualizations", tags=["visualizations"])

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    # Test Neo4j connection
    try:
        with neo4j_driver.session() as session:
            result = session.run("RETURN 1 as test")
            print("✅ Neo4j connection successful")
    except Exception as e:
        print(f"❌ Neo4j connection failed: {e}")
        raise e
    
    # Initialize upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print("✅ Upload directory initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    neo4j_driver.close()
    print("✅ Neo4j driver closed")

@app.get("/")
async def root():
    return {"message": "Knowledge Graph AI Agent System API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        with neo4j_driver.session() as session:
            session.run("RETURN 1")
        return {"status": "healthy", "neo4j": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
