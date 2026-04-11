from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from langserve import add_routes
from rag_chain import final_chain
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PDF RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all (for dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")

# Disable streaming endpoints → Playground will use "invoke" (full answer at once)
add_routes(
    app,
    final_chain,
    path="/rag",
    enabled_endpoints=["invoke", "playground"]
)

print("🚀 Server is running!")
print("   → Playground (Non-streaming) : http://localhost:8000/rag/playground/")
print("   → Docs                       : http://localhost:8000/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)