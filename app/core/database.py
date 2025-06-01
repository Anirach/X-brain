from neo4j import GraphDatabase
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Neo4jDatabase:
    def __init__(self):
        self.driver = None
        self.connect()
    
    def connect(self):
        """Establish connection to Neo4j database"""
        try:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
            )
            logger.info("Connected to Neo4j database")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise e
    
    def close(self):
        """Close the database connection"""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def session(self):
        """Get a new database session"""
        return self.driver.session(database=settings.NEO4J_DATABASE)
    
    def execute_query(self, query: str, parameters: dict = None):
        """Execute a Cypher query"""
        with self.session() as session:
            result = session.run(query, parameters or {})
            return [record for record in result]
    
    def execute_write_query(self, query: str, parameters: dict = None):
        """Execute a write Cypher query"""
        with self.session() as session:
            result = session.write_transaction(self._execute_query, query, parameters or {})
            return result
    
    @staticmethod
    def _execute_query(tx, query: str, parameters: dict):
        """Transaction function for write queries"""
        result = tx.run(query, parameters)
        return [record for record in result]

# Global database instance
neo4j_db = Neo4jDatabase()
neo4j_driver = neo4j_db.driver
