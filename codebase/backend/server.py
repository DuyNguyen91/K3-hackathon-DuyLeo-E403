import sys
import os
import json
import datetime
import http.server
import socketserver
import urllib.request
import urllib.error

# Load environment variables from .env files
try:
    from dotenv import load_dotenv
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Load in priority order: backend > root > frontend (frontend/.env is canonical config)
    load_dotenv(dotenv_path=os.path.join(current_dir, '.env'), override=False)
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(current_dir), '.env'), override=False)
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(current_dir), 'frontend', '.env'), override=True)
except ImportError:
    pass

# Force UTF-8 encoding on Windows standard streams
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add current directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PORT = 8000

def run_fastapi_uvicorn():
    try:
        import uvicorn
        from backend.app.main import app
        print(f"[FastAPI Server] Đang khởi chạy Uvicorn server trên http://127.0.0.1:{PORT} ...")
        uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
        return True
    except ImportError as e:
        print(f"[FastAPI Server Warning] Không tìm thấy thư viện uvicorn/fastapi ({e}). Chuyển sang Native Python HTTP Service...")
        return False
    except Exception as e:
        print(f"[FastAPI Server Warning] Không thể khởi động Uvicorn ({e}). Chuyển sang Native Python HTTP Service...")
        return False

from backend.app.services.gemini_service import gemini_service
from backend.app.services.rag_service import rag_service

# Built-in Standard Library Fallback HTTP Server with FastAPI compatible endpoints
class FallbackHandler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/health':
            self._send_json({
                "status": "ok",
                "backend": "FastAPI Native Bridge (Python 3.10)",
                "version": "1.0.0",
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
            })
        elif self.path == '/api/ai/provider':
            self._send_json({
                "success": True,
                "config": gemini_service.get_config(),
                "message": "Cấu hình Provider AI hiện tại"
            })
        elif self.path == '/api/ai/rag/stats':
            self._send_json(rag_service.get_stats())
        else:
            self._send_json({
                "message": "DocuMind AI Python Backend Running!",
                "health": "/api/health"
            })

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        body = json.loads(post_data.decode('utf-8')) if post_data else {}

        if self.path == '/api/ai/provider':
            updated = gemini_service.configure(
                api_key=body.get('api_key'),
                base_url=body.get('base_url'),
                model=body.get('model'),
                provider_type=body.get('provider_type')
            )
            self._send_json({
                "success": True,
                "config": updated,
                "message": "Đã cập nhật cấu hình Provider thành công"
            })

        elif self.path == '/api/ai/chat':
            if not gemini_service.is_configured():
                self._send_json({
                    "success": False,
                    "fallbackMessage": "AI API Key chưa được cấu hình.",
                    "engine": "FastAPI Python Bridge"
                })
                return

            prompt = body.get('prompt', '')
            doc_context = body.get('documentContext', '')
            quote = body.get('quote')
            mode = body.get('mode', 'chat')

            system_instruction = (
                "Bạn là trợ lý AI chuyên nghiệp cho DocuMind AI. Trả lời chính xác, rõ ràng bằng Tiếng Việt "
                "dựa trên thông tin tài liệu được cung cấp. Trả lời dưới định dạng gạch đầu dòng rõ ràng."
            )
            if mode == 'explain' or quote:
                system_instruction += "\nGiải thích đoạn trích dẫn được bôi đen trong NGỮ CẢNH CỦA SLIDE/TRANG (Ý nghĩa chính, Phân tích trong Ngữ cảnh Slide, Kết luận & Lợi ích)."

            full_prompt = f"Tài liệu:\n{doc_context}\n\n"
            if quote:
                full_prompt += f"Trích dẫn: \"{quote}\"\n\n"
            full_prompt += f"Câu hỏi: {prompt or 'Giải thích nội dung này'}"

            res = gemini_service.generate_content(
                prompt=full_prompt,
                system_instruction=system_instruction
            )
            if res.get("success"):
                self._send_json({
                    "success": True,
                    "text": res.get("text"),
                    "engine": "FastAPI Python Backend"
                })
            else:
                self._send_json({
                    "success": False,
                    "error": res.get("error"),
                    "engine": "FastAPI Python Backend"
                })

        elif self.path == '/api/ai/summary':
            if not gemini_service.is_configured():
                self._send_json({
                    "success": False,
                    "fallbackMessage": "Chưa cấu hình API Key trên server",
                    "engine": "FastAPI Python Backend"
                })
                return

            doc_context = body.get('documentContext', '')
            doc_title = body.get('documentTitle', 'Tài liệu')
            sum_type = body.get('summaryType', 'full')
            length = body.get('length', 'detailed')
            page = body.get('currentPage', 1)

            prompt = f"Dựa vào tài liệu '{doc_title}', hãy tạo tóm tắt dạng JSON với title, description, takeaways (mảng chuỗi), conclusion.\nNội dung:\n{doc_context}"
            res = gemini_service.generate_content(prompt=prompt, json_mode=True)
            if res.get("success") and res.get("text"):
                try:
                    self._send_json({
                        "success": True,
                        "summary": json.loads(res.get("text")),
                        "engine": "FastAPI Python Backend"
                    })
                except Exception as err:
                    self._send_json({
                        "success": False,
                        "error": str(err),
                        "engine": "FastAPI Python Backend"
                    })
            else:
                self._send_json({
                    "success": False,
                    "error": res.get("error"),
                    "engine": "FastAPI Python Backend"
                })

        elif self.path == '/api/ai/quiz':
            if not gemini_service.is_configured():
                self._send_json({
                    "success": False,
                    "fallbackMessage": "Chưa cấu hình API Key trên server",
                    "engine": "FastAPI Python Backend"
                })
                return

            doc_context = body.get('documentContext', '')
            prompt = f"Dựa vào tài liệu sau, tạo 1 câu hỏi trắc nghiệm JSON:\n{doc_context}\nTrả về JSON với question, options (4 lựa chọn), correctIndex, explanation, pageSource."
            
            res = gemini_service.generate_content(
                prompt=prompt,
                json_mode=True
            )
            if res.get("success") and res.get("text"):
                try:
                    self._send_json({
                        "success": True,
                        "quiz": json.loads(res.get("text")),
                        "engine": "FastAPI Python Backend"
                    })
                except Exception as err:
                    self._send_json({
                        "success": False,
                        "error": f"Lỗi parse JSON: {str(err)}",
                        "engine": "FastAPI Python Backend"
                    })
            else:
                self._send_json({
                    "success": False,
                    "error": res.get("error"),
                    "engine": "FastAPI Python Backend"
                })

        elif self.path == '/api/ai/rag/ingest':
            doc_id = body.get('doc_id', '')
            file_name = body.get('file_name', '')
            pages = body.get('pages', [])
            file_bytes = body.get('file_bytes')
            if file_bytes:
                import base64
                try:
                    pdf_bytes = base64.b64decode(file_bytes)
                    res = rag_service.ingest_pdf_bytes(doc_id=doc_id, file_name=file_name, file_bytes=pdf_bytes)
                except Exception as exc:
                    res = {"success": False, "error": f"Không thể đọc file_bytes: {exc}", "doc_id": doc_id, "file_name": file_name}
            else:
                res = rag_service.ingest_document(doc_id=doc_id, file_name=file_name, pages_data=pages)
            self._send_json(res)

        elif self.path == '/api/ai/rag/query':
            query = body.get('query', '')
            doc_id = body.get('doc_id')
            top_k = body.get('top_k', 4)
            augmented = rag_service.get_augmented_prompt(query=query, doc_id=doc_id, top_k=top_k)

            if not gemini_service.is_configured():
                self._send_json({
                    "success": True,
                    "query": query,
                    "answer": "Đã tìm thấy các đoạn PDF trích xuất từ RAG Vector Store. (Chưa cấu hình API Key)",
                    "retrieved_chunks": augmented["retrieved_chunks"],
                    "engine": "LangChain RAG Engine"
                })
                return

            system_instruction = (
                "Bạn là hệ thống RAG (Retrieval-Augmented Generation) thông minh cho DocuMind. "
                "Dựa vào các đoạn trích từ tài liệu PDF trong LangChain Vector Store, trả lời chính xác, "
                "mạch lạc câu hỏi của người dùng và trích dẫn số trang."
            )
            res = gemini_service.generate_content(
                prompt=augmented["augmented_prompt"],
                system_instruction=system_instruction
            )
            self._send_json({
                "success": True,
                "query": query,
                "answer": res.get("text") if res.get("success") else f"Lỗi: {res.get('error')}",
                "retrieved_chunks": augmented["retrieved_chunks"],
                "engine": "LangChain RAG Engine"
            })

        elif self.path == '/api/ai/rag/clear':
            rag_service.clear()
            self._send_json({"success": True, "message": "Đã xóa toàn bộ dữ liệu trong kho LangChain Vector Store"})

        else:
            self._send_json({"error": "Endpoint not found"}, status=404)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def run_fallback():
    print(f"[FastAPI Python Engine] Đang chạy server trên http://127.0.0.1:{PORT} ...")
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with ReusableTCPServer(("127.0.0.1", PORT), FallbackHandler) as httpd:
            httpd.serve_forever()
    except OSError as e:
        print(f"[FastAPI Server Error] {e}")

if __name__ == "__main__":
    if not run_fastapi_uvicorn():
        run_fallback()
