import sys
import os

# Ensure parent directory (backend/) is in sys.path when running `python main.py` or `python app/main.py`
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import responses, students, algorithms
from app.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing SQLite database and seeding from CSV...")
    init_db(seed_from_csv=True)
    print("API ready.")
    yield

app = FastAPI(
    title="SparkSchool Knowledge Tracing & Adaptive Recommendation API",
    description="Full-stack adaptive knowledge tracing API using Enhanced Bayesian Knowledge Tracing (BKT) with Response Time heuristics and Offline/Sync resilience.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend client connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(responses.router)
app.include_router(students.router)
app.include_router(algorithms.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "SparkSchool Adaptive Knowledge Tracing API",
        "endpoints": [
            "POST /response - Submit response & get updated estimate + recommendation",
            "POST /response/sync - Offline batch sync with deduplication",
            "GET /student/{id}/estimate - Per-skill mastery snapshot",
            "GET /students - List all classroom students",
            "GET /skills - List skill hierarchy",
            "POST /reset_and_seed - Reset database from seed CSV",
            "POST /algorithms/compare - Run & compare 6 knowledge tracing algorithms",
            "GET/POST /algorithms/parameters - Get or update BKT & algorithm parameters",
            "POST /algorithms/dag_propagate - Simulate Multi-Skill Bayesian Network DAG propagation"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    # Automatically detect module string so `python main.py` works from both backend/app/ and backend/
    module_name = "main:app" if os.path.basename(os.getcwd()) == "app" else "app.main:app"
    uvicorn.run(module_name, host="0.0.0.0", port=8000, reload=True)
