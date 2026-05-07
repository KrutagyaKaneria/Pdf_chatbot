from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder


contextualize_q_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Given the conversation memory summary (if any), the chat history, and the latest user question, "
            "rewrite the question as a standalone question that can be understood without the chat history. "
            "Do NOT answer it; only rewrite it if needed.\n\n"
            "Memory summary (may be empty):\n{memory_summary}",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ]
)


qa_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an expert assistant.

Use the information sources in this order:
1) Document context (authoritative for factual claims)
2) Conversation memory (summary + recent chat history) for follow-ups and continuity

Rules:
- Be clear, concise, and professional.
- Use bullet points when helpful.
- If the answer is not supported by document context OR conversation memory, say "I don't know".
- If the user asks to elaborate/summarize/clarify a previous point, you may rely on conversation memory.

Context:
{context}

Conversation memory summary (may be empty):
{memory_summary}""",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ]
)


memory_summarize_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are maintaining a running memory summary for a single chat session.

Update the existing summary using ONLY the new messages provided.
- Preserve key facts, decisions, entities, user preferences, constraints, and open questions.
- Keep it concise and information-dense.
- Do not invent details.
- Output ONLY the updated summary text (no headings, no bullets unless necessary).""",
        ),
        ("human", "Existing summary:\n{existing_summary}\n\nNew messages to incorporate:\n{new_messages}"),
    ]
)
