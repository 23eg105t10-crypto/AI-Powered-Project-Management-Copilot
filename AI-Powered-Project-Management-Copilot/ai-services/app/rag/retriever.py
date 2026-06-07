def chunk_text(text: str, size: int = 700, overlap: int = 120):
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start+size])
        start += size - overlap
    return chunks

def retrieve_context(query: str, documents: list[str], k: int = 3):
    # Lightweight fallback semantic retrieval based on keyword overlap.
    query_terms = set(query.lower().split())
    scored = []
    for i, doc in enumerate(documents):
        score = len(query_terms.intersection(set(doc.lower().split())))
        scored.append((score, i, doc))
    return [doc for _, _, doc in sorted(scored, reverse=True)[:k]]
