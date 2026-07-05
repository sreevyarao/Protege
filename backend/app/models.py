from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import datetime, timezone

def utcnow():
    return datetime.now(timezone.utc)

class Session(SQLModel, table=True):
    id: str = Field(primary_key=True)
    topic: str
    coverage: int = 0
    clarity: int = 0
    confidence: int = 0
    created_at: datetime = Field(default_factory=utcnow)
    
    messages: List["Message"] = Relationship(back_populates="session")
    knowledge_nodes: List["KnowledgeNode"] = Relationship(back_populates="session")
    fact_vectors: List["FactVector"] = Relationship(back_populates="session")

class Message(SQLModel, table=True):
    id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    role: str # 'user' or 'ai'
    content: str
    created_at: datetime = Field(default_factory=utcnow)
    
    session: Session = Relationship(back_populates="messages")

class KnowledgeNode(SQLModel, table=True):
    id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    concept_name: str
    summary: str
    
    session: Session = Relationship(back_populates="knowledge_nodes")
    
class KnowledgeEdge(SQLModel, table=True):
    id: str = Field(primary_key=True)
    source_node_id: str = Field(foreign_key="knowledgenode.id")
    target_node_id: str = Field(foreign_key="knowledgenode.id")
    relationship: str

class FactVector(SQLModel, table=True):
    id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    text_content: str
    embedding_json: str # JSON string of list of floats
    
    session: Session = Relationship(back_populates="fact_vectors")
