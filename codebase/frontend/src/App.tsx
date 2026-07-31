import { useState, useEffect, useRef } from 'react';
import { AppMode, ChatMessage, DocumentItem, RelatedDocument } from './types';
import { INITIAL_DOCUMENTS, MOCK_RELATED_DOCUMENTS } from './data/mockDocuments';
import { TopNavBar } from './components/TopNavBar';
import { DocumentViewer } from './components/DocumentViewer';
import { AIAssistantPane } from './components/AIAssistantPane';
import { UploadModal } from './components/UploadModal';
import { AIProviderModal } from './components/AIProviderModal';

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [currentDocId, setCurrentDocId] = useState<string>('doc-1');
  const [activeTab, setActiveTab] = useState<'workspace' | 'documents' | 'library'>('workspace');
  const [activeMode, setActiveMode] = useState<AppMode>('chat');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocument[]>(MOCK_RELATED_DOCUMENTS);
  const ingestPromiseRef = useRef<Promise<void>>(Promise.resolve());

  const currentDocument = documents.find((d) => d.id === currentDocId) || documents[0] || null;

  // Tự động trích xuất và lưu nội dung tài liệu PDF hiện tại vào LangChain RAG Vector Store
  useEffect(() => {
    if (!currentDocument) return;

    // Bỏ qua uploaded PDFs (blob URL) – đã được xử lý qua file_bytes trong handleFileUpload
    if (currentDocument.fileUrl?.startsWith('blob:')) return;

    const pages = currentDocument.content.sections.map((sec) => ({
      page_number: sec.pageNumber || 1,
      heading: sec.heading || '',
      content: sec.paragraphs.map((p) => p.text).join('\n'),
    }));

    fetch('/api/ai/rag/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: currentDocument.id,
        file_name: currentDocument.fileName || currentDocument.title,
        pages,
      }),
    }).catch((err) => console.log('LangChain RAG ingest log:', err));
  }, [currentDocument?.id]);

  // Initial conversation welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: 'Tôi đã sẵn sàng phân tích tài liệu. Bạn muốn tìm hiểu thông tin gì? Bạn có thể nhập câu hỏi trực tiếp hoặc bôi đen đoạn văn bản trong tài liệu để yêu cầu giải thích.',
    },
  ]);

  // Handle text selection "Giải thích đoạn này"
  const handleExplainSnippet = async (
    snippet: string,
    context?: { slideTitle?: string; pageNumber?: number; sectionHeading?: string; pageContext?: string }
  ) => {
    setIsChatOpen(true);
    setActiveMode('chat');
    const slideTitle = context?.slideTitle || currentDocument?.content?.title || currentDocument?.title || 'Slide / Trang tài liệu';
    const pageNum = context?.pageNumber || currentDocument?.currentPage || 1;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quote: snippet.length > 120 ? snippet.substring(0, 120) + '...' : snippet,
      text: `Giải thích đoạn văn bản này trong ngữ cảnh slide "${slideTitle}" (Trang ${pageNum}).`,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const docContext =
      context?.pageContext ||
      currentDocument?.content?.sections?.map((s) => `[Mục: ${s.heading}]\n${s.paragraphs.map((p) => p.text).join('\n')}`).join('\n\n') ||
      snippet;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Hãy giải thích đoạn văn bản được trích dẫn một cách chi tiết trong ngữ cảnh của Slide/Trang "${slideTitle}" (Trang ${pageNum}).`,
          quote: snippet,
          documentContext: `Tiêu đề Slide/Trang: ${slideTitle}\nSố trang: ${pageNum}\n\nToàn bộ nội dung Slide/Trang:\n${docContext}`,
          mode: 'explain',
          doc_id: currentDocument?.id,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.success && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: data.text,

          },
        ]);
      } else {
        const errorMsg = data.error || data.fallbackMessage;
        if (errorMsg) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-ai-${Date.now()}`,
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `⚠️ **Lỗi kết nối AI Provider:**\n\n${errorMsg}`,

            },
          ]);
        } else {
          // Fallback response if API key is not set
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-ai-${Date.now()}`,
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `**Phân tích đoạn trích dẫn trong ngữ cảnh Slide "${slideTitle}" (Trang ${pageNum}):**\n\n• **Ý nghĩa chính:**\n${snippet}\n\n• **Ngữ cảnh trong Slide:** Đoạn văn này làm rõ lý do tại sao công ty cần tái cấu trúc mạng lưới logistics nhằm chuẩn bị cho định hướng mở rộng thị trường khu vực.\n\n• **Tác động & Lợi ích:** Chuyển đổi sang mô hình RDH giúp giảm 22% chi phí vận chuyển mỗi đơn vị và cắt giảm 40% thời gian giao hàng.`,

            },
          ]);
        }
      }
    } catch {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `**Phân tích chi tiết trong ngữ cảnh Slide "${slideTitle}":**\n\n• **Ý nghĩa chính:** Tối ưu hóa chuỗi cung ứng bằng cách chuyển giao các trung tâm phân phối khu vực.\n• **Ngữ cảnh Slide:** Liên kết trực tiếp tới chỉ số hiệu quả kinh doanh Q3 và chiến lược đầu tư CapEx 18 tháng tới.`,
        },
      ]);
    }
  };

  // Handle generating structured summary
  const handleGenerateSummary = async (options?: { summaryType?: string; length?: string }) => {
    setIsChatOpen(true);
    setIsLoading(true);
    const summaryType = options?.summaryType || 'full';
    const length = options?.length || 'detailed';

    const docTitle = currentDocument?.content?.title || currentDocument?.title || 'Tài liệu';
    const pageNum = currentDocument?.currentPage || 1;

    const docContext =
      `Tài liệu: ${docTitle}\n` +
      (currentDocument?.content?.sections
        ?.map((s) => `[Trang ${s.pageNumber} - ${s.heading}]\n${s.paragraphs.map((p) => p.text).join('\n')}`)
        .join('\n\n') || '');

    const typeLabels: Record<string, string> = {
      full: 'Toàn bộ tài liệu',
      page: `Trang ${currentDocument?.currentPage || 1}`,
      key_takeaways: 'Điểm cốt lõi (Key Takeaways)',
      financial: 'Chỉ số tài chính & KPI',
    };

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Tạo bản tóm tắt: ${typeLabels[summaryType] || 'Tài liệu'} (${length === 'short' ? 'Ngắn gọn' : length === 'bullet' ? 'Gạch đầu dòng' : length === 'workflow' ? 'Quy trình Workflow' : 'Chi tiết'}).`,
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContext: docContext,
          documentTitle: docTitle,
          summaryType,
          length,
          currentPage: pageNum,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      const isWorkflow = length === 'workflow';

      const defaultMindmap = {
        root: docTitle || 'Sơ đồ Quy trình Workflow',
        branches: [
          {
            title: 'Khởi tạo & Thu thập đầu vào',
            subitems: ['Tiếp nhận dữ liệu báo cáo & chứng từ', 'Xác minh điều kiện hợp lệ', 'Phân loại nhóm dữ liệu chính']
          },
          {
            title: 'Xử lý Phân tích & Tối ưu',
            subitems: ['Đánh giá chỉ số hiệu suất doanh thu (+18%)', 'Phân tích điểm thắt nút chi phí vận tải', 'Mô hình hóa mô hình phân phối RDH (tiết kiệm 22%)']
          },
          {
            title: 'Thực thi & Giải ngân Hạ tầng',
            subitems: ['Phê duyệt gói CapEx 45 triệu USD', 'Mở rộng quy mô hạ tầng kho bãi', 'Điều phối nguồn lực logistics khu vực']
          },
          {
            title: 'Đánh giá Kết quả & Kết luận',
            subitems: ['Kiểm soát tỷ lệ thanh khoản & rủi ro', 'Báo cáo chỉ số KPI lên Ban Quản trị', 'Kế hoạch triển khai bứt phá Quý 4']
          }
        ]
      };

      if (data.success && data.summary) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'summary',
            summaryData: {
              title: data.summary.title || `Bản tóm tắt: ${docTitle}`,
              description: data.summary.description || 'Tổng quan nội dung chính của tài liệu.',
              takeaways: data.summary.takeaways || ['Điểm cốt lõi 1', 'Điểm cốt lõi 2'],
              conclusion: data.summary.conclusion || 'Kết luận chung cho tài liệu.',
              isWorkflow: isWorkflow || Boolean(data.summary.mindmap),
              mindmap: data.summary.mindmap || (isWorkflow ? defaultMindmap : undefined),
            },
          },
        ]);
      } else {
        const errorMsg = data.error || data.fallbackMessage;
        if (errorMsg) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-ai-${Date.now()}`,
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `⚠️ **Lỗi kết nối AI Provider:**\n\nKhông thể tạo tóm tắt tài liệu. Chi tiết lỗi:\n\`\`\`\n${errorMsg}\n\`\`\``,

            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-ai-${Date.now()}`,
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'summary',
              summaryData: {
                title: `Bản tóm tắt tự động: ${docTitle}`,
                description: `Tài liệu "${docTitle}" trình bày báo cáo hiệu quả tài chính Q3, tập trung vào chiến lược mở rộng quy mô logistics và tối ưu hóa chi phí vận hành.`,
                takeaways: [
                  'Doanh thu Quý 3 đạt 45.2 triệu USD (+18% so với cùng kỳ năm ngoái).',
                  'Tối ưu hóa chi phí: Tiết kiệm 22% chi phí vận tải nhờ mô hình trung tâm phân phối khu vực (RDH).',
                  'Kế hoạch giải ngân CapEx 45 triệu USD trong 18 tháng để xây dựng hạ tầng kho bãi.',
                ],
                conclusion: 'Công ty giữ vững vị thế tài chính và khả năng thanh khoản cao, sẵn sàng bứt phá trong Quý 4.',
                isWorkflow,
                mindmap: isWorkflow ? defaultMindmap : undefined,
              },
            },
          ]);
        }
      }
    } catch {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'summary',
          summaryData: {
            title: `Tóm tắt tổng quan: ${docTitle}`,
            description: `Báo cáo phân tích hiệu quả hoạt động và định hướng chiến lược.`,
            takeaways: [
              'Tăng trưởng doanh thu 18% YoY.',
              'Tái cấu trúc chuỗi cung ứng khu vực.',
              'Tăng biên lợi nhuận gộp thêm 1.5%.',
            ],
            conclusion: 'Tình hình kinh doanh khả quan và tăng trưởng ổn định.',
          },
        },
      ]);
    }
  };

  // Handle user typing a message in chat input
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Chờ backend extract PDF xong mới gửi chat (nếu file vừa upload)
    if (currentDocument?.fileUrl) {
      await ingestPromiseRef.current;
    }

    const docContext = currentDocument?.content?.sections
      ?.map((s) => `[Trang ${s.pageNumber} - ${s.heading}]\n${s.paragraphs.map((p) => p.text).join('\n')}`)
      .join('\n\n') || '';

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          documentContext: docContext,
          mode: activeMode,
          doc_id: currentDocument?.id,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.success && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: data.text,

          },
        ]);
      } else {
        const errorMsg = data.error || data.fallbackMessage;
        if (errorMsg) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-ai-${Date.now()}`,
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `⚠️ **Lỗi kết nối AI Provider:**\n\n${errorMsg}`,

            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-ai-${Date.now()}`,
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `DocuMind AI phản hồi cho câu hỏi "${text}":\n\nDựa trên tài liệu **${currentDocument?.fileName}**, các số liệu chính cho thấy sự tăng trưởng vững chắc trong Quý 3 với tỷ lệ cải thiện biên lợi nhuận đáng kể.`,

            },
          ]);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ **Lỗi kết nối:** Không thể gửi yêu cầu tới server (${err.message || 'Unknown error'}).`,
        },
      ]);
    }
  };

  // Handle quiz radio option selection
  const handleSelectQuizOption = (messageId: string, optionIndex: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.quizData) {
          return {
            ...msg,
            quizData: {
              ...msg.quizData,
              selectedIndex: optionIndex,
            },
          };
        }
        return msg;
      })
    );
  };

  // Handle checking quiz answer
  const handleCheckQuizAnswer = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.quizData) {
          const selected = msg.quizData.selectedIndex;
          if (selected === undefined) {
            alert('Vui lòng chọn 1 đáp án trước khi kiểm tra!');
            return msg;
          }
          const isCorrect = selected === msg.quizData.correctIndex;
          return {
            ...msg,
            quizData: {
              ...msg.quizData,
              isChecked: true,
              explanation:
                msg.quizData.explanation ||
                (isCorrect
                  ? 'Chính xác! Bạn đã chọn đúng đáp án dựa trên nội dung phân tích tài liệu.'
                  : `Chưa chính xác. Đáp án đúng là Lựa chọn ${String.fromCharCode(65 + msg.quizData.correctIndex)}.`),
            },
          };
        }
        return msg;
      })
    );
  };

  // Handle generating AI quiz question
  const handleGenerateQuiz = async (options?: { scope?: string; difficulty?: string }) => {
    setIsChatOpen(true);
    setIsLoading(true);

    const scope = options?.scope || 'full';
    const difficulty = options?.difficulty || 'medium';
    const docTitle = currentDocument?.content?.title || currentDocument?.title || 'Tài liệu';
    const pageNum = currentDocument?.currentPage || 1;

    const docContext =
      `Tài liệu: ${docTitle}\n` +
      (currentDocument?.content?.sections
        ?.map((s) => `[Trang ${s.pageNumber} - ${s.heading}]\n${s.paragraphs.map((p) => p.text).join('\n')}`)
        .join('\n\n') || '');

    const scopeLabels: Record<string, string> = {
      full: 'Toàn bộ tài liệu',
      page: `Trang ${currentDocument?.currentPage || 1}`,
      financial: 'Tài chính & KPI',
    };

    const diffLabels: Record<string, string> = {
      easy: 'Dễ',
      medium: 'Trung bình',
      hard: 'Nâng cao',
    };

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Tạo câu hỏi Quiz kiểm tra: ${scopeLabels[scope] || 'Tài liệu'} (Mức độ: ${diffLabels[difficulty] || 'Trung bình'}).`,
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContext: docContext,
          documentTitle: docTitle,
          scope,
          difficulty,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.success && data.quiz) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-ai-${Date.now()}`,
            type: 'quiz',
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Dưới đây là câu hỏi Quiz được AI khởi tạo tự động từ tài liệu:`,
            quizData: {
              ...data.quiz,
              userAnswered: false,
            },
          },
        ]);
      } else {
        const errorMsg = data.error || data.fallbackMessage;
        if (errorMsg) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-ai-${Date.now()}`,
              sender: 'ai',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `⚠️ **Lỗi kết nối AI Provider:**\n\nKhông thể tạo câu hỏi trắc nghiệm (Quiz). Chi tiết lỗi:\n\`\`\`\n${errorMsg}\n\`\`\``,

            },
          ]);
        } else {
          const sampleQuestions = [
            {
              question: `Theo báo cáo ${docTitle}, yếu tố chính nào dẫn đến sự biến động của dòng tiền đầu tư trong Quý 3?`,
              options: [
                'Tăng chi phí mua nguyên vật liệu thô từ đối tác nước ngoài',
                'Giải ngân cho dự án mở rộng nhà máy sản xuất tại khu vực phía Nam',
                'Thanh toán cổ tức cho cổ đông bằng tiền mặt',
                'Đầu tư vào trái phiếu chính phủ ngắn hạn',
              ],
              correctIndex: 1,
              explanation: 'Dự án mở rộng nhà máy phía Nam khiến dòng tiền đầu tư ghi nhận mức âm 210 tỷ VNĐ trong kỳ (xem trang 12).',
            },
            {
              question: `Chỉ số tài chính trọng yếu nào thể hiện mức tăng trưởng tích cực nhất trong ${docTitle}?`,
              options: [
                'Tỷ lệ biên lợi nhuận gộp (+18% YoY)',
                'Chi phí quản lý doanh nghiệp',
                'Tổng nợ phải trả ngắn hạn',
                'Chi phí bán hàng và marketing',
              ],
              correctIndex: 0,
              explanation: 'Biên lợi nhuận gộp đạt mức tăng trưởng ấn tượng 18% so với cùng kỳ năm trước nhờ tối ưu hóa chuỗi ứng ứng.',
            },
            {
              question: `Kế hoạch phân bổ vốn CapEx 45 triệu USD trong 18 tháng tới được tập trung vào mục đích nào?`,
              options: [
                'Chi trả nợ vay ngân hàng thương mại',
                'Xây dựng hạ tầng hệ thống trung tâm phân phối kho bãi RDH',
                'Rót vốn vào các quỹ đầu tư tài chính mạo hiểm',
                'Mua lại cổ phiếu quỹ từ thị trường tự do',
              ],
              correctIndex: 1,
              explanation: 'Hạ tầng kho bãi RDH giúp công ty tiết kiệm 22% chi phí vận chuyển chặng cuối.',
            },
          ];

          setMessages((prev) => {
            const currentCount = prev.filter((m) => m.type === 'quiz').length;
            const sample = sampleQuestions[currentCount % sampleQuestions.length];
            return [
              ...prev,
              {
                id: `msg-ai-${Date.now()}`,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'quiz',
                quizData: {
                  questionNumber: currentCount + 1,
                  totalQuestions: 5,
                  question: sample.question,
                  options: sample.options,
                  correctIndex: sample.correctIndex,
                  explanation: sample.explanation,
                  pageSource: pageNum,
                },
              },
            ];
          });
        }
      }
    } catch {
      setIsLoading(false);
      setMessages((prev) => {
        const currentCount = prev.filter((m) => m.type === 'quiz').length;
        return [
          ...prev,
          {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'quiz',
            quizData: {
              questionNumber: currentCount + 1,
              totalQuestions: 5,
              question: `Chỉ số tài chính trọng yếu nào được nhấn mạnh chính trong ${docTitle}?`,
              options: [
                'Doanh thu thuần và biên lợi nhuận gộp Q3',
                'Tỷ lệ nợ trên vốn chủ sở hữu D/E',
                'Chỉ số hoàn vốn đầu tư ROI',
                'Giá trị vốn hóa thị trường',
              ],
              correctIndex: 0,
              explanation: 'Tài liệu tập trung phân tích Doanh thu thuần đạt 45.2M USD và biên lợi nhuận gộp đạt 28.5%.',
              pageSource: pageNum,
            },
          },
        ];
      });
    }
  };

  // Handle custom PDF upload
  const handleFileUpload = (file: File) => {
    const fileUrl = URL.createObjectURL(file);
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileUrl: fileUrl,
      pageCount: 1,
      currentPage: 1,
      zoom: 100,
      lastModified: 'Vừa xong',
      department: 'Tài liệu đã tải lên',
      fileType: 'PDF',
      content: {
        title: file.name.replace(/\.[^/.]+$/, ''),
        subtitle: `Tải lên từ máy tính (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        sections: [
          {
            id: 'sec-uploaded-1',
            heading: 'Nội dung tài liệu đã tải lên',
            pageNumber: 1,
            paragraphs: [
              {
                id: 'p-up-1',
                text: `File "${file.name}" đã được tải lên thành công. Bạn có thể xem trực tiếp bản PDF gốc bên dưới hoặc chuyển đổi sang dạng AI Trích Xuất để tương tác với Trợ lý AI.`,
                isHighlighted: true,
                highlightText: 'Giải thích đoạn này',
              },
            ],
          },
        ],
      },
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setCurrentDocId(newDoc.id);

    // Trích xuất và đẩy nội dung PDF vừa tải lên vào LangChain RAG Vector Store
    ingestPromiseRef.current = new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as ArrayBuffer | null;
        if (!result) {
          resolve();
          return;
        }

        const bytes = new Uint8Array(result);
        let binary = '';
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          const chunk = bytes.subarray(offset, offset + chunkSize);
          binary += String.fromCharCode(...chunk);
        }

        fetch('/api/ai/rag/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_id: newDoc.id,
            file_name: newDoc.fileName,
            file_bytes: btoa(binary),
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.extracted_pages && data.extracted_pages.length > 0) {
              setDocuments((prev) =>
                prev.map((doc) =>
                  doc.id === newDoc.id
                    ? {
                      ...doc,
                      pageCount: data.extracted_pages.length,
                      content: {
                        ...doc.content,
                        sections: data.extracted_pages.map(
                          (page: { page_number: number; heading: string; content: string }) => ({
                            id: `sec-extracted-${page.page_number}`,
                            heading: page.heading,
                            pageNumber: page.page_number,
                            paragraphs: page.content.split('\n\n').map(
                              (text: string, idx: number) => ({
                                id: `p-extracted-${page.page_number}-${idx}`,
                                text,
                              })
                            ),
                          })
                        ),
                      },
                    }
                    : doc
                )
              );
            }
          })
          .catch((err) => console.log('LangChain RAG upload ingest:', err))
          .finally(() => resolve());
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Switch to related doc
  const handleOpenRelatedDoc = (docId: string) => {
    const found = documents.find((d) => d.id === docId);
    if (found) {
      setCurrentDocId(found.id);
      setActiveMode('chat');
    } else {
      // Create a document from related item
      const rel = relatedDocs.find((r) => r.id === docId);
      if (rel) {
        const createdDoc: DocumentItem = {
          id: rel.id,
          title: rel.title,
          fileName: rel.fileName,
          pageCount: 15,
          currentPage: 1,
          zoom: 100,
          lastModified: 'Vừa xong',
          department: rel.department,
          fileType: rel.fileType,
          content: {
            title: rel.title,
            subtitle: rel.department,
            sections: [
              {
                id: 'sec-rel-1',
                heading: rel.title,
                pageNumber: 1,
                paragraphs: [
                  {
                    id: 'p-rel-1',
                    text: rel.snippet.replace(/"/g, ''),
                    isHighlighted: true,
                    highlightText: 'Giải thích đoạn này',
                  },
                ],
              },
            ],
          },
        };
        setDocuments((prev) => [createdDoc, ...prev]);
        setCurrentDocId(createdDoc.id);
        setActiveMode('chat');
      }
    }
  };

  // Add custom Web or YouTube link to related documents
  const handleAddRelatedLink = (link: {
    title: string;
    url: string;
    fileType: 'Web' | 'YouTube';
    snippet: string;
  }) => {
    const newDoc: RelatedDocument = {
      id: `rel-link-${Date.now()}`,
      title: link.title,
      fileName: link.url.replace(/^https?:\/\//, ''),
      department: link.fileType === 'YouTube' ? 'Kênh YouTube' : 'Trang Web Liên quan',
      fileType: link.fileType,
      matchPercentage: 95,
      snippet: link.snippet,
      url: link.url,
    };
    setRelatedDocs((prev) => [newDoc, ...prev]);
  };

  // Page navigation & Zoom in DocumentViewer
  const handlePageChange = (newPage: number) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === currentDocId ? { ...d, currentPage: newPage } : d))
    );
  };

  const handleZoomChange = (newZoom: number) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === currentDocId ? { ...d, zoom: newZoom } : d))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased">
      {/* Top Navigation Bar */}
      <TopNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onUploadClick={() => setIsUploadModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentDocument={currentDocument}
        documents={documents}
        onSelectDocument={(doc) => setCurrentDocId(doc.id)}
        onOpenProviderSettings={() => setIsProviderModalOpen(true)}
      />

      {/* Main App Workspace (Fluid Document Workspace) */}
      <main className="flex-1 flex overflow-hidden w-full max-w-[1440px] mx-auto p-3 sm:p-4 md:p-6 gap-4 md:gap-6 relative">
        {/* Primary Document Viewer Pane (Full Width) */}
        <DocumentViewer
          document={currentDocument}
          onUploadClick={() => setIsUploadModalOpen(true)}
          onExplainSnippet={handleExplainSnippet}
          onPageChange={handlePageChange}
          onZoomChange={handleZoomChange}
          onFileUpload={handleFileUpload}
        />

        {/* Floating AI Assistant Chat Pane */}
        {isChatOpen && (
          <AIAssistantPane
            messages={messages}
            activeMode={activeMode}
            setActiveMode={setActiveMode}
            onSendMessage={handleSendMessage}
            onGenerateSummary={handleGenerateSummary}
            onGenerateQuiz={handleGenerateQuiz}
            isLoading={isLoading}
            relatedDocuments={relatedDocs}
            currentDocument={currentDocument}
            onOpenRelatedDoc={handleOpenRelatedDoc}
            onAddRelatedLink={handleAddRelatedLink}
            onSelectQuizOption={handleSelectQuizOption}
            onCheckQuizAnswer={handleCheckQuizAnswer}
            onOpenProviderSettings={() => setIsProviderModalOpen(true)}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </main>

      {/* Floating Chatbot Launch Icon (Bottom-Right) */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          aria-label="Mở Chatbot AI"
          title="Mở Chatbot AI Assistant"
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#003441] to-[#006a60] hover:from-[#00485a] hover:to-[#005149] text-white px-4 py-3 rounded-full shadow-2xl border-2 border-[#77f4e2]/60 flex items-center gap-2.5 transition-all duration-200 hover:scale-105 active:scale-95 group animate-in fade-in zoom-in-90"
        >
          <div className="relative flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[#77f4e2] filled">
              smart_toy
            </span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#77f4e2] rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#77f4e2] rounded-full"></span>
          </div>
          <span className="font-bold text-xs sm:text-sm text-white pr-1">
            DocuMind AI
          </span>
          <span className="bg-[#77f4e2]/20 text-[#77f4e2] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#77f4e2]/30 hidden sm:inline-block">
            FastAPI
          </span>
        </button>
      )}

      {/* Upload PDF Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        sampleDocuments={documents}
        onSelectDocument={(doc) => setCurrentDocId(doc.id)}
        onFileUpload={handleFileUpload}
      />

      {/* AI Provider Config Modal */}
      <AIProviderModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
      />
    </div>
  );
}
