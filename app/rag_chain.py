from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores import PGVector
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.runnables import RunnableParallel
from pydantic import BaseModel, Field
from operator import itemgetter
from langchain_community.llms import Ollama

# ====================== Embeddings & Vector Store ======================
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

vector_store = PGVector(
    collection_name="pdf_rag_vectors",
    connection_string="postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres",
    embedding_function=embeddings,
    use_jsonb=True,
)

retriever = vector_store.as_retriever(search_kwargs={"k": 3})

# ====================== Prompt ======================
template = """You are a helpful assistant.

Answer the question ONLY using the provided context.
If the answer is not clearly available, say "I don't know".

Do NOT make assumptions or add extra information.

Context:
{context}

Question:
{question}

Answer:"""

ANSWER_PROMPT = ChatPromptTemplate.from_template(template)

# ====================== LLM (OLLAMA 🔥) ======================
llm = Ollama(
    model="mistral",   # make sure you ran: ollama run mistral
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