import json
import math
from typing import List
from sqlmodel import Session, select
from app.models import FactVector

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def search_similar_facts(db: Session, session_id: str, query_embedding: List[float], limit: int = 5) -> List[FactVector]:
    statement = select(FactVector).where(FactVector.session_id == session_id)
    facts = db.exec(statement).all()
    
    scored_facts = []
    for fact in facts:
        try:
            fact_emb = json.loads(fact.embedding_json)
            score = cosine_similarity(query_embedding, fact_emb)
            scored_facts.append((score, fact))
        except (json.JSONDecodeError, ValueError):
            continue
            
    # Sort by score descending
    scored_facts.sort(key=lambda x: x[0], reverse=True)
    return [fact for score, fact in scored_facts[:limit]]
