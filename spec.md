# AI SPEC — Slide Companion · Nhóm 01 · Zone A

**Hướng:** ☑ A — VLearn  ☐ B — Trợ lý Học viên  ☐ C — Làn mở  
**Loại:** ☑ Tối ưu tính năng có sẵn  ☐ Tính năng mới

---

# §1. User & Job

### Job executor + workflow

**Job executor:** Học viên sử dụng VLearn.

**Workflow hiện tại**

1. Mở bài giảng trên VLearn.
2. Đọc slide.
3. Gặp đoạn khó hiểu.
4. Tự đọc lại hoặc tìm kiếm Google.
5. Nếu vẫn chưa hiểu thì hỏi tutor/giảng viên.
6. Quay lại học.

---

### Core JTBD

> Khi đang học, tôi muốn hiểu ngay đoạn slide mình đang đọc để có thể tiếp tục bài học mà không bị gián đoạn.

---

### Problem Statement

Học viên thường không hiểu một đoạn trong slide nhưng phải tự tìm kiếm hoặc hỏi tutor. Việc chuyển ngữ cảnh giữa bài học và công cụ khác làm gián đoạn quá trình học và giảm hiệu quả tiếp thu.

---

### Evidence

#### Data mining

Từ **chat_history_anonymized_for_hackathon.csv**

- "giải thích": **463** lần
- "slide": **174** lần
- "tóm tắt": **129** lần

Cho thấy nhu cầu giải thích nội dung bài học theo đúng ngữ cảnh xuất hiện rất thường xuyên.

---

#### Ví dụ hội thoại

- "Giải thích đoạn này."
- "Tóm tắt slide này."
- "Slide này nói gì?"
- "Em chưa hiểu phần này."
- "Giải thích giúp em trang này."

Nguồn:

chat_history_anonymized_for_hackathon.csv

---

# §2. Impact & Quyết định chọn

## Các ứng viên

| Ý tưởng | User | Tần suất | Cost | Khả thi |
|---------|------|----------|-------|----------|
| Slide Companion | Học viên | Rất cao | Cao | Cao |
| AI Quiz Generator | Học viên | Trung bình | Trung bình | Cao |
| Course Recommendation | Học viên | Thấp | Thấp | Trung bình |

---

## Ứng viên loại


### Course Recommendation

Không giúp người học hiểu nội dung ngay thời điểm gặp khó khăn.

---

## Ứng viên chọn

### Slide Companion

Lý do

- Pain xuất hiện nhiều nhất.
- Có dữ liệu chứng minh.
- Có thể demo hoàn chỉnh.
- Phù hợp thời gian Hackathon.

### AI Quiz Generator

Tăng bộ nhớ trong lúc học.

---

# §3. Giải pháp tương tự đã nghiên cứu

## ChatGPT

Đáng học

- Trả lời tự nhiên.
- Hội thoại liên tục.

Đáng né

- Không biết ngữ cảnh slide.

Khác biệt

Slide Companion chỉ trả lời dựa trên đoạn người học đang chọn.

---

## Microsoft Copilot

Đáng học

- Citation.
- Context.

Đáng né

- Trả lời quá dài.

Khác biệt

Tập trung vào bài giảng thay vì toàn bộ tài liệu.

---

# §4. Thiết kế

## Lát cắt

Một học viên muốn hiểu đúng đoạn slide đang xem, AI quyết định giải thích đúng đoạn được chọn và giúp người học tiếp tục bài học.

---

## Non-goals

- Không thay thế giảng viên.
- Không làm toàn bộ bài tập cho sinh viên.
- Không trả lời ngoài tài liệu.
- Không sinh nội dung không có căn cứ.

---

## Prototype

☐ Sketch

☐ Mock

☑ Working Prototype

Mock

- OCR
- Retrieval

Thật

- UI
- Flow
- Prompt

---

## Automation

☑ Augment

☐ Conditional

☐ Automate

Lý do

Nếu AI giải thích sai, người học có thể hiểu sai kiến thức.

AI chỉ hỗ trợ thay vì quyết định thay người dùng.

---

## §4b. Nguyên tắc thiết kế

| Nguyên tắc | Áp dụng |
|------------|----------|
| Ground responses in evidence | Chỉ trả lời dựa trên slide |
| Ask for clarification | Yêu cầu chọn đoạn nếu thiếu ngữ cảnh |
| Transparency | Hiển thị nguồn và mức độ tin cậy |
| Human in control | Người học quyết định lưu note, quiz |

---

# §5. Kiểu lỗi

## 1. Hallucination

- AI tự suy diễn ngoài slide.
- AI trích sai nguồn.

---

## 2. Thiếu ngữ cảnh

- Chưa highlight đoạn.
- Câu hỏi quá mơ hồ.

---

## 3. Ngoài phạm vi

- Giải đề thi.
- Trả lời kiến thức không có trong tài liệu.

---

## 4. Lỗi dữ liệu

- PDF không đọc được.
- Slide chỉ chứa hình ảnh.

---

# §6. Bốn đường đi trải nghiệm

## Happy Path

Upload

↓

Highlight

↓

Ask

↓

Answer

↓

Summary

↓

Quiz

↓

Save Note

---

## Low Confidence

Không đủ căn cứ

↓

Yêu cầu chọn đoạn.

---

## Failure

Không tìm thấy thông tin

↓

Thông báo

↓

Không suy diễn.

---

## Correction

Người dùng highlight lại

↓

AI trả lời lại.

---

## Ngoài phạm vi

AI từ chối và thông báo chỉ hỗ trợ nội dung trong tài liệu.

---

## Domain Case

Slide chứa công thức hoặc hình ảnh.

↓

Thông báo chưa hỗ trợ đầy đủ OCR.

---

# §7. Kiểm thử

## Chất lượng

Đúng ngữ cảnh.

Không hallucination.

Có citation.

---

## Golden Set

TODO

20 câu hỏi.

---

## Quality Bar

Đạt khi

- ≥90% đúng trên Golden Set.
- Không trả lời nếu không có căn cứ.

---

## Kết quả

TODO

Sau khi đánh giá.

---

# §8. Phân công

| Công việc | Người |
|------------|--------|
| Spec | Nguyễn Văn Duy |
| Evidence | Nguyễn Văn Duy |
| Prompt | Nguyễn Văn Duy |
| Prototype | Nguyễn Văn Duy |
| Demo | Nguyễn Văn Duy |

---

## Willing Users

1. Sinh viên VLearn
2. Trợ giảng
3. Giảng viên

---

## Validation

Ba câu hỏi

1. AI có trả lời đúng đoạn bạn chọn không?
2. Câu trả lời có dễ hiểu không?
3. Bạn có dùng lại tính năng này không?

---

## Multi Prototype

Prototype A

Chat Sidebar

Prototype B

Drawer AI

Chọn

Prototype B

Vì ít làm gián đoạn quá trình học.

---

# §9. Changelog

| Thời điểm | Thay đổi | Lý do |
|-----------|-----------|--------|
| CP1 | Chọn Slide Companion | Dựa trên evidence |
| CP2 | Thêm Summary và Quiz | Feedback người dùng |
| CP3 | Thêm Highlight bắt buộc | Giảm hallucination |
| CP4 | Thêm Citation | Tăng độ tin cậy |