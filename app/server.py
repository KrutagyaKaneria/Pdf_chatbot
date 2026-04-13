from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from langserve import add_routes
from rag_chain import final_chain
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="PDF RAG API")

# ✅ CORS (already good)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Serve PDFs
app.mount(
    "/pdfs",
    StaticFiles(directory="../source_docs"),
    name="pdfs",
)

@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")

# ✅ ENABLE STREAMING (IMPORTANT CHANGE)
add_routes(
    app,
    final_chain,
    path="/rag",
)

print("🚀 Server is running!")
print("   → Playground        : http://localhost:8000/rag/playground/")
print("   → Streaming API     : http://localhost:8000/rag/stream")
print("   → Docs              : http://localhost:8000/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)