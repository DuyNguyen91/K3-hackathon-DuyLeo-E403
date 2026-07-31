import re
from typing import Optional, Dict, Any

class GuardrailService:
    PROMPT_INJECTION_PATTERNS = [
        r"ignore\s+(all\s+|previous\s+|system\s+)?instruction",
        r"forget\s+(all\s+|previous\s+|system\s+)?instruction",
        r"you\s+are\s+now\s+dan",
        r"jailbreak",
        r"developer\s+mode",
        r"bypass\s+(safety|rules|guardrails|filters)",
        r"reveal\s+(your\s+)?(system\s+)?prompt",
        r"show\s+(your\s+)?(system\s+)?prompt",
        r"tell\s+me\s+(your\s+)?(system\s+)?prompt",
        r"bỏ\s+qua\s+(tất\s+cả\s+|mọi\s+)?chỉ\s+thị",
        r"bỏ\s+qua\s+(tất\s+cả\s+|mọi\s+)?quy\s+tắc",
        r"bỏ\s+qua\s+(tất\s+cả\s+|mọi\s+)?hướng\s+dẫn",
        r"tiết\s+lộ\s+prompt\s+hệ\s+thống",
        r"xóa\s+toàn\s+bộ\s+hướng\s+dẫn",
        r"giả\s+lập\s+vai\s+trò\s+mới\s+để\s+vượt\s+rào",
    ]

    EXCEEDING_CAPABILITY_PATTERNS = [
        r"\brm\s+-rf\b",
        r"\bformat\s+[c-z]:\b",
        r"\bdel\s+/f\s+/s\b",
        r"\bshutdown\s+-[sr]\b",
        r"\bpowershell\b",
        r"\bcmd\.exe\b",
        r"\bsudo\s+rm\b",
        r"hack\s+(website|tài\s+khoản|mật\s+khẩu|wifi|ngân\s+hàng)",
        r"tạo\s+(virus|mã\s+độc|trojan|keylogger)",
        r"ddos\s+attack",
        r"chuyển\s+tiền\s+(ngân\s+hàng|tài\s+khoản)",
        r"rút\s+tiền\s+tài\s+khoản",
        r"định\s+dạng\s+ổ\s+cứng",
        r"tắt\s+máy\s+tính\s+từ\s+xa",
    ]

    VAGUE_PROMPT_PATTERNS = [
        r"^\s*\?\s*$",
        r"^\s*sao\s+thế\s*\??\s*$",
        r"^\s*làm\s+đi\s*\!?\s*$",
        r"^\s*xét\s+cái\s+này\s*$",
        r"^\s*tại\s+sao\s*\??\s*$",
        r"^\s*nghĩa\s+là\s+gì\s*\??\s*$",
        r"^\s*thế\s+nào\s*\??\s*$",
        r"^\s*123\s*$",
        r"^\s*abc\s*$",
        r"^\s*test\s*$",
    ]

    @classmethod
    def inspect_prompt(
        cls,
        prompt: str,
        quote: Optional[str] = None,
        mode: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Kiểm tra câu hỏi của người dùng:
        - Nếu vi phạm Prompt Injection -> Trả về cảnh báo bảo mật
        - Nếu vượt quá khả năng -> Trả về thông báo giới hạn hệ thống
        - Nếu quá ngắn/mơ hồ mà không có quote -> Trả về yêu cầu làm rõ (clarify)
        - Ngược lại trả về None (hợp lệ)
        """
        clean_p = (prompt or "").strip().lower()

        # 1. Kiểm tra Prompt Injection
        for pat in cls.PROMPT_INJECTION_PATTERNS:
            if re.search(pat, clean_p, re.IGNORECASE):
                return {
                    "is_blocked": True,
                    "reason": "prompt_injection",
                    "text": (
                        "⚠️ **Cảnh báo Bảo mật & An toàn Prompt:**\n\n"
                        "Yêu cầu của bạn chứa các chỉ thị can thiệp/ghi đè hệ thống (**Prompt Injection**) "
                        "hoặc cố gắng truy cập thông tin cấu hình nội bộ.\n\n"
                        "Nhằm đảm bảo an toàn và tính bảo mật của DocuMind AI, hệ thống đã tự động ngăn chặn yêu cầu này. "
                        "Vui lòng gửi các câu hỏi liên quan đến nội dung tài liệu hoặc các tác vụ phân tích, tóm tắt, tạo Quiz."
                    )
                }

        # 2. Kiểm tra Vượt quá Khả năng
        for pat in cls.EXCEEDING_CAPABILITY_PATTERNS:
            if re.search(pat, clean_p, re.IGNORECASE):
                return {
                    "is_blocked": True,
                    "reason": "exceeding_capabilities",
                    "text": (
                        "ℹ️ **Thông báo Giới hạn Khả năng Hệ thống:**\n\n"
                        "Yêu cầu của bạn vượt quá phạm vi phục vụ và năng lực của **DocuMind AI** (Trợ lý Phân tích Tài liệu & Học tập).\n\n"
                        "DocuMind AI **không thể** thực hiện các thao tác:\n"
                        "1. Chạy lệnh hệ điều hành, can thiệp tập tin/phần cứng thiết bị.\n"
                        "2. Thực hiện giao dịch tài chính hay truy cập tài khoản ngân hàng thực tế.\n"
                        "3. Tạo mã độc, thực hiện hành vi can thiệp an ninh mạng.\n\n"
                        "Vui lòng đặt các câu hỏi liên quan đến đọc hiểu, tóm tắt, giải thích đoạn văn, tra cứu dữ liệu hoặc khởi tạo câu hỏi trắc nghiệm từ tài liệu nhé!"
                    )
                }

        # 3. Kiểm tra Câu hỏi Mơ hồ (Clarification required)
        # Chỉ áp dụng nếu không có trích dẫn quote và độ dài câu quá ngắn/khớp pattern mơ hồ
        if not quote and mode not in ["summary", "quiz", "explain"]:
            is_vague = False
            if len(clean_p) < 4:
                is_vague = True
            else:
                for pat in cls.VAGUE_PROMPT_PATTERNS:
                    if re.search(pat, clean_p, re.IGNORECASE):
                        is_vague = True
                        break

            if is_vague:
                return {
                    "is_blocked": True,
                    "reason": "clarification_needed",
                    "text": (
                        "❓ **DocuMind AI cần thêm thông tin để hỗ trợ bạn chính xác nhất:**\n\n"
                        "Câu hỏi/yêu cầu của bạn hiện chưa rõ ràng hoặc quá ngắn gọn. Vui lòng cung cấp thêm chi tiết hoặc lựa chọn các tính năng sau:\n\n"
                        "1. **Tóm tắt tài liệu:** Bạn muốn tóm tắt toàn bộ tài liệu hay chỉ riêng trang hiện tại?\n"
                        "2. **Giải thích đoạn văn:** Bạn có thể bôi đen (highlight) đoạn văn bản cần giải thích trong Slide/Trang.\n"
                        "3. **Tạo câu hỏi Quiz:** Chọn mục **Quiz** để AI tạo tự động bộ câu hỏi kiểm tra kiến thức.\n\n"
                        "Bạn hãy ghi rõ câu hỏi hoặc yêu cầu cụ thể hơn nhé!"
                    )
                }

        return None

guardrail_service = GuardrailService()
