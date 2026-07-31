import json
import math
import re
from typing import Any, Dict, List, Optional

import fitz


class LangChainDocument:
    """Mô phỏng LangChain Document object chứa page_content và metadata"""

    def __init__(self, page_content: str, metadata: Optional[Dict[str, Any]] = None):
        self.page_content = page_content
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_content": self.page_content,
            "metadata": self.metadata,
        }


class RecursiveCharacterTextSplitter:
    """LangChain RecursiveCharacterTextSplitter chia nhỏ văn bản PDF thành các chunk"""

    def __init__(self, chunk_size: int = 400, chunk_overlap: int = 80, separators: Optional[List[str]] = None):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split_text(self, text: str) -> List[str]:
        if not text:
            return []

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + self.chunk_size, text_len)
            if end < text_len:
                for sep in self.separators:
                    if sep:
                        pos = text.rfind(sep, start, end)
                        if pos != -1 and pos > start + (self.chunk_size // 2):
                            end = pos + len(sep)
                            break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            if end >= text_len:
                break

            start = max(end - self.chunk_overlap, start + 1)

        return chunks

    def create_documents(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> List[LangChainDocument]:
        documents = []
        for i, text in enumerate(texts):
            meta = metadatas[i] if metadatas and i < len(metadatas) else {}
            chunks = self.split_text(text)
            for j, chunk in enumerate(chunks):
                chunk_meta = dict(meta)
                chunk_meta["chunk_id"] = f"{meta.get('doc_id', 'doc')}_p{meta.get('page_number', 1)}_c{j + 1}"
                chunk_meta["chunk_index"] = j
                documents.append(LangChainDocument(page_content=chunk, metadata=chunk_meta))
        return documents


class VectorStoreRetriever:
    """LangChain VectorStore Retriever với mô hình TF-IDF Cosine Similarity cho RAG"""

    def __init__(self):
        self.documents: List[LangChainDocument] = []
        self.idf: Dict[str, float] = {}

    def _tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        return [w for w in cleaned.split() if len(w) > 1]

    def add_documents(self, docs: List[LangChainDocument]):
        self.documents.extend(docs)
        self._rebuild_index()

    def _rebuild_index(self):
        if not self.documents:
            return

        doc_count = len(self.documents)
        df: Dict[str, int] = {}

        for doc in self.documents:
            tokens = set(self._tokenize(doc.page_content))
            for token in tokens:
                df[token] = df.get(token, 0) + 1

        self.idf = {
            token: math.log((doc_count + 1) / (count + 1)) + 1.0
            for token, count in df.items()
        }

    def _get_vector(self, text: str) -> Dict[str, float]:
        tokens = self._tokenize(text)
        if not tokens:
            return {}

        tf: Dict[str, int] = {}
        for token in tokens:
            tf[token] = tf.get(token, 0) + 1

        length = len(tokens)
        vec: Dict[str, float] = {}
        for token, count in tf.items():
            if token in self.idf:
                vec[token] = (count / length) * self.idf[token]
        return vec

    def _cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        if not vec1 or not vec2:
            return 0.0

        common_keys = set(vec1.keys()) & set(vec2.keys())
        if not common_keys:
            return 0.0

        dot_product = sum(vec1[key] * vec2[key] for key in common_keys)
        norm1 = math.sqrt(sum(value * value for value in vec1.values()))
        norm2 = math.sqrt(sum(value * value for value in vec2.values()))

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def _metadata_score(self, query: str, metadata: Dict[str, Any]) -> float:
        query_tokens = set(self._tokenize(query))
        if not query_tokens:
            return 0.0

        metadata_text = " ".join(
            str(value) for value in [metadata.get("heading"), metadata.get("file_name"), metadata.get("chunk_id")]
            if value
        )
        metadata_tokens = set(self._tokenize(metadata_text))
        if not metadata_tokens:
            return 0.0

        matches = len(query_tokens & metadata_tokens)
        return (matches / len(query_tokens)) if query_tokens else 0.0

    def similarity_search(self, query: str, k: int = 4, doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.documents:
            return []

        query_vec = self._get_vector(query)
        query_tokens = set(self._tokenize(query))
        scored_docs = []

        for doc in self.documents:
            if doc_id and doc.metadata.get("doc_id") != doc_id:
                continue

            doc_vec = self._get_vector(doc.page_content)
            semantic_score = self._cosine_similarity(query_vec, doc_vec)

            doc_tokens = set(self._tokenize(doc.page_content))
            keyword_boost = 0.0
            if query_tokens:
                matches = len(query_tokens & doc_tokens)
                keyword_boost = (matches / len(query_tokens)) * 0.3

            metadata_score = self._metadata_score(query, doc.metadata) * 0.5
            combined_score = semantic_score + keyword_boost + metadata_score

            scored_docs.append({
                "document": doc,
                "score": combined_score,
            })

        scored_docs.sort(key=lambda item: item["score"], reverse=True)
        return scored_docs[:k]


class LangChainRAGService:
    """Quản lý toàn bộ vòng đời RAG (Extraction, Ingestion, Retrieval, Augmentation)"""

    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=80)
        self.vector_store = VectorStoreRetriever()
        self.ingested_files: Dict[str, Dict[str, Any]] = {}

    def _clear_doc_chunks(self, doc_id: str) -> None:
        self.vector_store.documents = [doc for doc in self.vector_store.documents if doc.metadata.get("doc_id") != doc_id]

    def _split_paragraphs(self, text: str) -> List[str]:
        if not text:
            return []

        normalized = re.sub(r"\r\n?", "\n", text)
        normalized = re.sub(r"[ \t]+", " ", normalized)
        paragraphs = [section.strip() for section in re.split(r"\n\s*\n", normalized) if section.strip()]
        return paragraphs or [normalized.strip()]

    def _create_documents_from_pages(self, doc_id: str, file_name: str, pages_data: List[Dict[str, Any]]) -> List[LangChainDocument]:
        documents: List[LangChainDocument] = []

        for page in pages_data:
            page_number = page.get("page_number", 1)
            heading = page.get("heading", "")
            raw_text = page.get("content", "")
            page_context = f"{heading}\n{raw_text}".strip()

            paragraphs = self._split_paragraphs(page_context)
            if not paragraphs:
                paragraphs = [page_context]

            for paragraph_index, paragraph in enumerate(paragraphs):
                metadata = {
                    "doc_id": doc_id,
                    "file_name": file_name,
                    "page_number": page_number,
                    "heading": heading,
                    "paragraph_index": paragraph_index,
                    "source": "pages_data",
                }
                documents.append(LangChainDocument(page_content=paragraph, metadata=metadata))

        return documents

    def ingest_document(self, doc_id: str, file_name: str, pages_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Trích xuất và lưu trữ toàn bộ nội dung PDF vào LangChain Vector Store
        pages_data: [{ "page_number": 1, "heading": "...", "content": "..." }, ...]
        """
        self._clear_doc_chunks(doc_id)

        docs = self._create_documents_from_pages(doc_id=doc_id, file_name=file_name, pages_data=pages_data)
        self.vector_store.add_documents(docs)

        self.ingested_files[doc_id] = {
            "doc_id": doc_id,
            "file_name": file_name,
            "total_pages": len(pages_data),
            "total_chunks": len(docs),
            "timestamp": json.dumps({"ingested": True}),
        }

        return {
            "success": True,
            "doc_id": doc_id,
            "file_name": file_name,
            "pages_processed": len(pages_data),
            "chunks_created": len(docs),
            "total_documents_in_vectorstore": len(self.vector_store.documents),
        }

    def ingest_pdf_bytes(self, doc_id: str, file_name: str, file_bytes: bytes) -> Dict[str, Any]:
        """Đọc file PDF thật bằng PyMuPDF, tách theo paragraph, rồi lưu vào RAG"""
        self._clear_doc_chunks(doc_id)

        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            return {
                "success": False,
                "error": f"Không thể mở PDF bằng PyMuPDF: {exc}",
                "doc_id": doc_id,
                "file_name": file_name,
            }

        paragraphs_data: List[Dict[str, Any]] = []
        try:
            for page_number, page in enumerate(document, start=1):
                page_text = page.get_text("text")
                paragraphs = self._split_paragraphs(page_text)
                if not paragraphs:
                    paragraphs = [""]
                for paragraph_index, paragraph in enumerate(paragraphs):
                    if not paragraph.strip():
                        continue
                    paragraphs_data.append({
                        "page_number": page_number,
                        "heading": f"Trang {page_number}",
                        "content": paragraph,
                        "paragraph_index": paragraph_index,
                    })
        finally:
            document.close()

        docs = []
        for item in paragraphs_data:
            metadata = {
                "doc_id": doc_id,
                "file_name": file_name,
                "page_number": item["page_number"],
                "heading": item["heading"],
                "paragraph_index": item.get("paragraph_index", 0),
                "source": "pymupdf",
            }
            docs.append(LangChainDocument(page_content=item["content"], metadata=metadata))

        self.vector_store.add_documents(docs)
        self.ingested_files[doc_id] = {
            "doc_id": doc_id,
            "file_name": file_name,
            "total_pages": len(paragraphs_data) and max(item["page_number"] for item in paragraphs_data) or 0,
            "total_chunks": len(docs),
            "timestamp": json.dumps({"ingested": True, "source": "pymupdf"}),
        }

        pages_grouped: Dict[int, List[str]] = {}
        for item in paragraphs_data:
            pn = item["page_number"]
            if pn not in pages_grouped:
                pages_grouped[pn] = []
            pages_grouped[pn].append(item["content"])

        extracted_pages = [
            {
                "page_number": pn,
                "heading": f"Trang {pn}",
                "content": "\n\n".join(paragraphs),
            }
            for pn, paragraphs in sorted(pages_grouped.items())
        ]

        return {
            "success": True,
            "doc_id": doc_id,
            "file_name": file_name,
            "pages_processed": max((item["page_number"] for item in paragraphs_data), default=0),
            "chunks_created": len(docs),
            "total_documents_in_vectorstore": len(self.vector_store.documents),
            "extracted_pages": extracted_pages,
        }

    def retrieve_context(self, query: str, top_k: int = 4, doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Truy vấn các chunk liên quan nhất từ PDF bằng RAG hybrid search"""
        results = self.vector_store.similarity_search(query=query, k=top_k, doc_id=doc_id)

        output = []
        for result in results:
            doc: LangChainDocument = result["document"]
            output.append({
                "chunk_id": doc.metadata.get("chunk_id"),
                "file_name": doc.metadata.get("file_name"),
                "page_number": doc.metadata.get("page_number"),
                "heading": doc.metadata.get("heading"),
                "content": doc.page_content,
                "score": round(result["score"], 4),
            })
        return output

    def get_augmented_prompt(self, query: str, doc_id: Optional[str] = None, top_k: int = 4) -> Dict[str, Any]:
        """Tạo Augmented Prompt kết hợp thông tin RAG trích xuất từ PDF"""
        chunks = self.retrieve_context(query, top_k=top_k, doc_id=doc_id)

        context_str = ""
        for i, chunk in enumerate(chunks, 1):
            context_str += f"\n--- [Trích dẫn RAG #{i} | Page {chunk['page_number']} - {chunk['heading']}] ---\n{chunk['content']}\n"

        augmented_prompt = (
            f"Nội dung trích xuất RAG từ tài liệu PDF (Top {len(chunks)} chunks liên quan):\n"
            f"{context_str if context_str else 'Không tìm thấy ngữ cảnh khớp trực tiếp trong kho RAG.'}\n\n"
            f"Câu hỏi của người dùng: {query}"
        )

        return {
            "augmented_prompt": augmented_prompt,
            "retrieved_chunks": chunks,
        }

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_files": len(self.ingested_files),
            "total_vector_chunks": len(self.vector_store.documents),
            "files": list(self.ingested_files.values()),
        }

    def clear(self):
        self.vector_store.documents.clear()
        self.ingested_files.clear()


rag_service = LangChainRAGService()
