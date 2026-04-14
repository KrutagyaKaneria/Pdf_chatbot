from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores import PGVector
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.runnables import RunnableParallel
from pydantic import BaseModel, Field
from operator import itemgetter
from langchain_ollama import OllamaLLM

# ====================== Embeddings & Vector Store ======================
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

vector_store = PGVector(
    collection_name="pdf_rag_vectors",
    connection_string="postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres",
    embedding_function=embeddings,
    use_jsonb=True,
)

retriever = vector_store.as_retriever(search_kwargs={"k": 4})

# ====================== Prompt ======================
template = """You are a legal assistant.

Answer the question using ONLY the provided context.

Rules:
- Give a clear and structured answer
- Use bullet points if helpful
- Keep it concise (max 5-6 points)
- Do NOT repeat sentences
- Do NOT hallucinate
- If unsure, say "I don't know"

Context:
{context}

Question:
{question}

Answer:
"""

ANSWER_PROMPT = ChatPromptTemplate.from_template(template)

# ====================== LLM (OLLAMA 🔥) ======================
llm = OllamaLLM(
    model="phi",   # make sure you ran: ollama run mistral
    temperature=0.3
)

# ====================== Input Schema ======================
class QuestionInput(BaseModel):
    question: str = Field(..., description="The question to ask the RAG system")

# ====================== Helper ======================
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# ====================== RAG Chain ======================
chain = (
    RunnableParallel(
        context=itemgetter("question") | retriever,
        question=itemgetter("question"),
    )
    | RunnableParallel(
        answer=ANSWER_PROMPT | llm | StrOutputParser(),
        docs=itemgetter("context"),
    )
)

final_chain = chain.with_types(input_type=QuestionInput)

# ====================== Local test ======================
if __name__ == "__main__":
    result = final_chain.invoke({
        "question": "What is this document about?"
    })
    print("\n🔥 RESULT:\n", result)