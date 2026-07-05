from pydantic import BaseModel, Field
from typing import List

# Evaluator Agent Schema
class Fact(BaseModel):
    statement: str = Field(..., min_length=5, max_length=500, description="A single, concrete factual claim extracted directly from the session. Must be verifiable.")

class EvaluatorOutput(BaseModel):
    facts: List[Fact] = Field(default_factory=list, description="Exhaustive list of all verifiable facts from the session transcript. Empty list if nothing factual was discussed.")

# Draft Agent Schema (Knowledge Graph)
class KGNode(BaseModel):
    concept_name: str = Field(..., min_length=2, max_length=100, description="Standardized name of the core concept. Capitalized.")
    summary: str = Field(..., min_length=10, max_length=200, description="Brief, self-contained summary of the concept based ONLY on the transcript.")

class KGEdge(BaseModel):
    source_concept: str = Field(..., min_length=2, max_length=100, description="Exact name of the source concept, matching a node's concept_name.")
    target_concept: str = Field(..., min_length=2, max_length=100, description="Exact name of the target concept, matching a node's concept_name.")
    relationship: str = Field(..., min_length=2, max_length=150, description="Action verb phrase describing how the source relates to the target (e.g. 'is a type of', 'depends on').")

class DraftOutput(BaseModel):
    nodes: List[KGNode] = Field(default_factory=list, description="Extracted distinct concepts. Empty if none found.")
    edges: List[KGEdge] = Field(default_factory=list, description="Relationships strictly between the extracted nodes. Empty if none found.")

# Final Agent Schema (Metrics)
class MetricsOutput(BaseModel):
    coverage: int = Field(default=0, ge=0, le=100, description="Score 0-100: How comprehensively was the core topic covered compared to a standard overview?")
    clarity: int = Field(default=0, ge=0, le=100, description="Score 0-100: How clearly and simply did the user explain the concepts?")
    confidence: int = Field(default=0, ge=0, le=100, description="Score 0-100: How confident did the user appear in their explanations?")
