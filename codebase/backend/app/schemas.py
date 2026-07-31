from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    prompt: Optional[str] = Field(default="", description="The user query or prompt")
    documentContext: Optional[str] = Field(default="", description="Document text or context")
    quote: Optional[str] = Field(default=None, description="Direct quoted text snippet from document")
    mode: Optional[str] = Field(default="chat", description="Mode: chat, summary, quiz, or explain")
    doc_id: Optional[str] = Field(default=None, description="Filter RAG search to this document")

class ChatResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    fallbackMessage: Optional[str] = None
    engine: str = "FastAPI Python"
    error: Optional[str] = None

class QuizRequest(BaseModel):
    documentContext: str = Field(..., description="Document content to generate quiz from")
    questionCount: Optional[int] = Field(default=5, description="Number of questions requested")

class QuizData(BaseModel):
    question: str
    options: List[str]
    correctIndex: int
    explanation: str
    pageSource: int = 1

class QuizResponse(BaseModel):
    success: bool
    quiz: Optional[Dict[str, Any]] = None
    fallbackMessage: Optional[str] = None
    engine: str = "FastAPI Python"
    error: Optional[str] = None

class SummaryRequest(BaseModel):
    documentContext: str = Field(..., description="Nội dung tài liệu cần tóm tắt")
    summaryType: Optional[str] = Field(default="full", description="Loại tóm tắt: full, page, key_takeaways, financial")
    length: Optional[str] = Field(default="detailed", description="Độ dài: short, detailed, bullet")
    documentTitle: Optional[str] = Field(default="Tài liệu", description="Tiêu đề tài liệu")
    currentPage: Optional[int] = Field(default=1, description="Trang hiện tại (nếu tóm tắt trang)")

class SummaryData(BaseModel):
    title: str
    description: str
    takeaways: List[str]
    conclusion: str

class SummaryResponse(BaseModel):
    success: bool
    summary: Optional[Dict[str, Any]] = None
    fallbackMessage: Optional[str] = None
    engine: str = "FastAPI Python"
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    backend: str
    version: str
    timestamp: str

class ProviderConfigRequest(BaseModel):
    api_key: Optional[str] = Field(default=None, description="Khóa API mới (hoặc giữ nguyên nếu để trống)")
    base_url: Optional[str] = Field(default=None, description="Endpoint Base URL tùy chỉnh")
    model: Optional[str] = Field(default=None, description="Tên mô hình tùy chỉnh (ví dụ gemini-2.5-flash, gpt-4o)")
    provider_type: Optional[str] = Field(default=None, description="Loại provider: 'gemini' hoặc 'openai_compatible'")

class ProviderConfigResponse(BaseModel):
    success: bool
    config: Dict[str, Any]
    message: Optional[str] = None

class RAGPageItem(BaseModel):
    page_number: int = 1
    heading: Optional[str] = ""
    content: str

class IngestDocRequest(BaseModel):
    doc_id: str
    file_name: str
    pages: Optional[List[RAGPageItem]] = None
    file_bytes: Optional[str] = Field(default=None, description="Base64-encoded PDF bytes for direct ingestion")

class ExtractedPage(BaseModel):
    page_number: int
    heading: str
    content: str

class IngestDocResponse(BaseModel):
    success: bool
    doc_id: str
    file_name: str
    pages_processed: int
    chunks_created: int
    total_documents_in_vectorstore: int
    extracted_pages: Optional[List[ExtractedPage]] = None

class RAGQueryRequest(BaseModel):
    query: str
    doc_id: Optional[str] = None
    top_k: Optional[int] = 4

class RAGQueryResponse(BaseModel):
    success: bool
    query: str
    answer: Optional[str] = None
    retrieved_chunks: List[Dict[str, Any]]
    engine: str = "LangChain RAG + FastAPI Python"


