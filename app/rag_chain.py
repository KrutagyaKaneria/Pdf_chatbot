import os
from dotenv import load_dotenv

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.vectorstores import PGVector
from langchain_huggingface import HuggingFaceEmbeddings
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables import RunnableLambda

load_dotenv()

CONNECTION_STRING = os.getenv(
    "PGVECTOR_CONNECTION_STRING",
    "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres",
)

# ====================== Embeddings ======================
embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"local_files_only": True},
)

# ====================== Prompts ======================
contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", "Given the chat history and the latest user question, rephrase the question to be a standalone question that can be understood without the chat history. Do NOT answer it, just rephrase if needed."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}")
])

qa_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert legal assistant.

Answer the question **only** using the provided context.
- Be clear, concise and professional.
- Use bullet points when helpful.
- Maximum 5-6 key points.
- Never hallucinate or add external information.
- If the answer is not in the context, say "I don't know".

Context:
{context}"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}")
])

# ====================== LLM ======================
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.2,
    max_tokens=512,
    api_key=os.getenv("GROQ_API_KEY"),
)

# ====================== Input Schema ======================
class QuestionInput(BaseModel):
    question: str
    collection_name: str
    chat_history: list = Field(default_factory=list)   # list of {"role": , "content": }


# ====================== Helpers ======================
def format_docs(docs):
    return "\n\n".join(
        f"[Source: {os.path.basename(doc.metadata.get('source', 'Uploaded PDF'))}, Page {doc.metadata.get('page', 'N/A')}]\n{doc.page_content}"
        for doc in docs
    )

def extract_sources(docs):
    seen = set()
    sources = []
    for doc in docs:
        source = doc.metadata.get("source", "Uploaded PDF")
        page = doc.metadata.get("page")
        key = (source, page)
        if key in seen:
            continue
        seen.add(key)
        sources.append({"source": source, "page": page})
    return sources


# ====================== Conversational RAG Pipeline ======================
def rag_pipeline(input_dict: dict):
    collection_name = input_dict.get("collection_name")
    question = (input_dict.get("question") or "").strip()
    raw_history = input_dict.get("chat_history", [])

    if not collection_name:
        raise ValueError("collection_name is required")
    if not question:
        raise ValueError("question is required")

    # Convert to LangChain messages (keep last 6 messages = last 3 turns)
    chat_history = []
    for msg in raw_history[-6:]:
        if msg.get("role") == "user":
            chat_history.append(HumanMessage(content=msg.get("content", "")))
        elif msg.get("role") == "assistant":
            chat_history.append(AIMessage(content=msg.get("content", "")))

    # Contextualize follow-up questions before retrieval, otherwise MMR searches
    # against pronouns like "that" instead of the document-specific topic.
    if chat_history:
        contextualized = contextualize_q_prompt.invoke({
            "chat_history": chat_history,
            "question": question
        })
        final_question = llm.invoke(contextualized).content.strip()
    else:
        final_question = question

    # Dynamic Vector Store
    vector_store = PGVector(
        collection_name=collection_name,
        connection_string=CONNECTION_STRING,
        embedding_function=embeddings,
        use_jsonb=True,
    )

    retriever = vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={"k": 5, "fetch_k": 20, "lambda_mult": 0.7}
    )

    docs = retriever.invoke(final_question)
    context = format_docs(docs)

    # Generate final answer
    final_prompt = qa_prompt.invoke({
        "context": context,
        "chat_history": chat_history,
        "question": final_question
    })

    response = llm.invoke(final_prompt)
    answer = response.content if hasattr(response, "content") else str(response)

    return {
        "answer": answer,
        "docs": extract_sources(docs),
        "collection_name": collection_name
    }


# ====================== FINAL CHAIN ======================
final_chain = RunnableLambda(rag_pipeline).with_types(input_type=QuestionInput)


# ====================== LOCAL TEST ======================
if __name__ == "__main__":
    test_input = {
        "question": "What is this document about?",
        "collection_name": "pdf_session_test123",
        "chat_history": []
    }
    result = rag_pipeline(test_input)
    print("\n🔥 RESULT:\n", result)
