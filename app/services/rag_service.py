import os

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnableLambda
from langchain_groq import ChatGroq

from app.core.config import Settings, get_settings
from app.core.exceptions import LLMError, ValidationAppError, VectorStoreError
from app.core.logging import get_logger
from app.db.pgvector import get_vector_store
from app.models.schemas import QuestionInput, RagResult, SourceReference
from app.prompts.rag_prompts import contextualize_q_prompt, qa_prompt


logger = get_logger(__name__)


class RAGService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.llm = ChatGroq(
            model=self.settings.groq_model,
            temperature=self.settings.llm_temperature,
            max_tokens=self.settings.llm_max_tokens,
            api_key=self.settings.groq_api_key,
        )

    def answer(self, question: str, collection_name: str, chat_history: list[dict[str, str]]) -> RagResult:
        question = (question or "").strip()
        collection_name = (collection_name or "").strip()
        if not question:
            raise ValidationAppError("question is required")
        if not collection_name:
            raise ValidationAppError("collection_name is required")

        lc_history = self._to_langchain_messages(chat_history)
        final_question = self._contextualize_question(question, lc_history)

        try:
            vector_store = get_vector_store(collection_name)
            retriever = vector_store.as_retriever(
                search_type="mmr",
                search_kwargs={
                    "k": self.settings.retriever_k,
                    "fetch_k": self.settings.retriever_fetch_k,
                    "lambda_mult": self.settings.retriever_lambda_mult,
                },
            )
            docs = retriever.invoke(final_question)
        except Exception as exc:
            raise VectorStoreError("Vector retrieval failed", details={"reason": str(exc)}) from exc

        logger.info(
            "Retrieved RAG documents",
            extra={"collection_name": collection_name, "doc_count": len(docs)},
        )

        context = self._format_docs(docs)
        try:
            final_prompt = qa_prompt.invoke(
                {"context": context, "chat_history": lc_history, "question": final_question}
            )
            response = self.llm.invoke(final_prompt)
        except Exception as exc:
            raise LLMError("LLM generation failed", details={"reason": str(exc)}) from exc

        answer = response.content if hasattr(response, "content") else str(response)
        return RagResult(
            answer=answer,
            docs=self._extract_sources(docs),
            collection_name=collection_name,
        )

    def _contextualize_question(self, question: str, chat_history):
        if not chat_history:
            return question
        try:
            prompt = contextualize_q_prompt.invoke({"chat_history": chat_history, "question": question})
            response = self.llm.invoke(prompt)
            return response.content.strip()
        except Exception as exc:
            raise LLMError("Question contextualization failed", details={"reason": str(exc)}) from exc

    def _to_langchain_messages(self, raw_history: list[dict[str, str]]):
        messages = []
        for msg in raw_history[-self.settings.history_message_limit :]:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg.get("content", "")))
        return messages

    @staticmethod
    def _format_docs(docs) -> str:
        return "\n\n".join(
            f"[Source: {os.path.basename(doc.metadata.get('source', 'Uploaded PDF'))}, "
            f"Page {doc.metadata.get('page', 'N/A')}]\n{doc.page_content}"
            for doc in docs
        )

    @staticmethod
    def _extract_sources(docs) -> list[SourceReference]:
        seen = set()
        sources = []
        for doc in docs:
            source = doc.metadata.get("source", "Uploaded PDF")
            page = doc.metadata.get("page")
            key = (source, page)
            if key in seen:
                continue
            seen.add(key)
            sources.append(SourceReference(source=source, page=page))
        return sources


def rag_pipeline(input_dict: dict) -> dict:
    result = RAGService().answer(
        question=input_dict.get("question", ""),
        collection_name=input_dict.get("collection_name", ""),
        chat_history=input_dict.get("chat_history", []),
    )
    return result.model_dump()


final_chain = RunnableLambda(rag_pipeline).with_types(input_type=QuestionInput)
