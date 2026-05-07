from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder


contextualize_q_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Given the chat history and the latest user question, rephrase the question "
            "to be a standalone question that can be understood without the chat history. "
            "Do NOT answer it, just rephrase if needed.",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ]
)


qa_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an expert legal assistant.

Answer the question **only** using the provided context.
- Be clear, concise and professional.
- Use bullet points when helpful.
- Maximum 5-6 key points.
- Never hallucinate or add external information.
- If the answer is not in the context, say "I don't know".

Context:
{context}""",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ]
)
