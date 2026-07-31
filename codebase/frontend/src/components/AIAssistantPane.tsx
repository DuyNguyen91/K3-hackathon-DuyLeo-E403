import React, { useState, useRef, useEffect } from 'react';
import { AppMode, ChatMessage, DocumentItem, RelatedDocument } from '../types';

interface AIAssistantPaneProps {
  messages: ChatMessage[];
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
  onSendMessage: (text: string) => void;
  onGenerateSummary: (options?: { summaryType?: string; length?: string }) => void;
  onGenerateQuiz?: (options?: { scope?: string; difficulty?: string }) => void;
  isLoading: boolean;
  relatedDocuments: RelatedDocument[];
  currentDocument: DocumentItem | null;
  onOpenRelatedDoc: (docId: string) => void;
  onToggleSaveRelatedDoc?: (docId: string) => void;
  onAddRelatedLink?: (link: { title: string; url: string; fileType: 'Web' | 'YouTube'; snippet: string }) => void;
  onSelectQuizOption: (messageId: string, optionIndex: number) => void;
  onCheckQuizAnswer: (messageId: string) => void;
  onOpenProviderSettings?: () => void;
  onClose?: () => void;
}

export const AIAssistantPane: React.FC<AIAssistantPaneProps> = ({
  messages,
  activeMode,
  setActiveMode,
  onSendMessage,
  onGenerateSummary,
  onGenerateQuiz,
  isLoading,
  relatedDocuments,
  currentDocument,
  onOpenRelatedDoc,
  onAddRelatedLink,
  onSelectQuizOption,
  onCheckQuizAnswer,
  onOpenProviderSettings,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const [summaryType, setSummaryType] = useState<string>('full');
  const [summaryLength, setSummaryLength] = useState<string>('detailed');
  const [quizScope, setQuizScope] = useState<string>('full');
  const [quizDifficulty, setQuizDifficulty] = useState<string>('medium');

  // State for adding new Web or YouTube link
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkType, setNewLinkType] = useState<'Web' | 'YouTube'>('Web');
  const [newLinkSnippet, setNewLinkSnippet] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isLoading, activeMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <aside className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] md:w-[460px] h-[620px] max-h-[85vh] bg-white rounded-2xl border border-[#006a60] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="border-b border-[#c0c8cb] p-3.5 flex justify-between items-center bg-[#003441] text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#77f4e2]/20 text-[#77f4e2] flex items-center justify-center shrink-0 border border-[#77f4e2]/30">
            <span className="material-symbols-outlined text-lg filled">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-bold text-xs sm:text-sm text-white leading-tight">DocuMind Assistant</h2>
            </div>
            <span className="text-[10px] text-[#9acee1] font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#77f4e2] inline-block animate-pulse"></span>
              Sẵn sàng trợ giúp
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onClose && (
            <button
              onClick={onClose}
              title="Thu nhỏ Chatbot"
              className="p-1.5 text-[#9acee1] hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher / Quick Action Chips + Sticky Options Bar */}
      <div className="px-4 py-2 border-b border-[#c0c8cb] bg-[#f8f9ff] flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              activeMode === 'chat'
                ? 'bg-[#006a60] text-white shadow-xs'
                : 'border border-[#c0c8cb] text-[#40484b] hover:bg-[#eff4ff]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">forum</span>
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveMode('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              activeMode === 'summary'
                ? 'bg-[#006a60] text-white shadow-xs'
                : 'border border-[#c0c8cb] text-[#40484b] hover:bg-[#eff4ff]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">summarize</span>
            <span>Tóm tắt</span>
          </button>

          <button
            onClick={() => setActiveMode('quiz')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              activeMode === 'quiz'
                ? 'bg-[#006a60] text-white shadow-xs'
                : 'border border-[#c0c8cb] text-[#40484b] hover:bg-[#eff4ff]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">quiz</span>
            <span>Tạo Quiz</span>
          </button>

          {/* <button
            onClick={() => setActiveMode('related')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              activeMode === 'related'
                ? 'bg-[#006a60] text-white shadow-xs'
                : 'border border-[#c0c8cb] text-[#40484b] hover:bg-[#eff4ff]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">account_tree</span>
            <span>Liên quan</span>
          </button> */}
        </div>

        {/* Compact Summary Options Header Extension (Stick to header, 2 rows + 2-row height button on right) */}
        {activeMode === 'summary' && (
          <div className="pt-2 border-t border-[#c0c8cb]/60 bg-[#eff4ff] p-2 rounded-xl grid grid-cols-[1fr_auto] gap-2 items-stretch">
            {/* Left side: 2 stacked rows for Vị trí & Độ dài */}
            <div className="flex flex-col gap-1.5 justify-center min-w-0">
              {/* Row 1: Vị trí */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#003441]">
                <span className="text-[#40484b] shrink-0 min-w-[62px]">Vị trí:</span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#c0c8cb] overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSummaryType('page')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                      summaryType === 'page'
                        ? 'bg-[#006a60] text-white font-bold'
                        : 'text-[#40484b] hover:bg-gray-100'
                    }`}
                  >
                    Trang hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryType('full')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                      summaryType === 'full'
                        ? 'bg-[#006a60] text-white font-bold'
                        : 'text-[#40484b] hover:bg-gray-100'
                    }`}
                  >
                    Toàn bộ trang
                  </button>
                </div>
              </div>

              {/* Row 2: Phong cách */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#003441]">
                <span className="text-[#40484b] shrink-0 min-w-[62px]">Phong cách:</span>
                <select
                  value={summaryLength}
                  onChange={(e) => setSummaryLength(e.target.value as 'short' | 'detailed' | 'bullet' | 'workflow')}
                  className="bg-white text-[#003441] font-semibold text-[11px] px-2 py-1 rounded-lg border border-[#c0c8cb] outline-none focus:ring-1 focus:ring-[#006a60] cursor-pointer shadow-2xs"
                >
                  <option value="detailed">Chi tiết</option>
                  <option value="short">Ngắn gọn</option>
                  <option value="bullet">Gạch đầu dòng</option>
                  <option value="workflow">Workflow</option>
                </select>
              </div>
            </div>

            {/* Right side: Nút Tạo tóm tắt ngay spanning height of both rows */}
            <button
              type="button"
              onClick={() => {
                onGenerateSummary({ summaryType, length: summaryLength });
                scrollToBottom();
              }}
              disabled={isLoading}
              className="bg-[#006a60] hover:bg-[#00524a] text-white font-bold text-xs px-3 py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 shadow-sm disabled:opacity-50 h-full self-stretch shrink-0"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span className="text-center leading-tight whitespace-nowrap">{isLoading ? 'Đang tạo...' : 'Tạo tóm tắt ngay'}</span>
            </button>
          </div>
        )}

        {/* Compact Quiz Options Header Extension (Stick to header, 2 rows + 2-row height button on right) */}
        {activeMode === 'quiz' && (
          <div className="pt-2 border-t border-[#c0c8cb]/60 bg-[#eff4ff] p-2 rounded-xl grid grid-cols-[1fr_auto] gap-2 items-stretch">
            {/* Left side: 2 stacked rows for Vị trí & Độ khó */}
            <div className="flex flex-col gap-1.5 justify-center min-w-0">
              {/* Row 1: Vị trí */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#003441]">
                <span className="text-[#40484b] shrink-0 min-w-[62px]">Vị trí:</span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#c0c8cb] overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setQuizScope('page')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                      quizScope === 'page'
                        ? 'bg-[#006a60] text-white font-bold'
                        : 'text-[#40484b] hover:bg-gray-100'
                    }`}
                  >
                    Trang hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizScope('full')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                      quizScope === 'full'
                        ? 'bg-[#006a60] text-white font-bold'
                        : 'text-[#40484b] hover:bg-gray-100'
                    }`}
                  >
                    Toàn bộ trang
                  </button>
                </div>
              </div>

              {/* Row 2: Độ khó */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#003441]">
                <span className="text-[#40484b] shrink-0 min-w-[62px]">Độ khó:</span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#c0c8cb] overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setQuizDifficulty('easy')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                      quizDifficulty === 'easy'
                        ? 'bg-[#006a60] text-white font-bold'
                        : 'text-[#40484b] hover:bg-gray-100'
                    }`}
                  >
                    Dễ
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizDifficulty('medium')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                      quizDifficulty === 'medium'
                        ? 'bg-[#006a60] text-white font-bold'
                        : 'text-[#40484b] hover:bg-gray-100'
                    }`}
                  >
                    Trung bình
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizDifficulty('hard')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                      quizDifficulty === 'hard'
                        ? 'bg-[#006a60] text-white font-bold'
                        : 'text-[#40484b] hover:bg-gray-100'
                    }`}
                  >
                    Nâng cao
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: Nút Tạo quiz ngay spanning height of both rows */}
            <button
              type="button"
              onClick={() => {
                if (onGenerateQuiz) {
                  onGenerateQuiz({ scope: quizScope, difficulty: quizDifficulty });
                }
                scrollToBottom();
              }}
              disabled={isLoading}
              className="bg-[#006a60] hover:bg-[#00524a] text-white font-bold text-xs px-3 py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 shadow-sm disabled:opacity-50 h-full self-stretch shrink-0"
            >
              <span className="material-symbols-outlined text-base">psychology</span>
              <span className="text-center leading-tight whitespace-nowrap">{isLoading ? 'Đang tạo...' : 'Tạo quiz ngay'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 bg-[#f8f9ff]">
        {/* Mode: Related Documents View */}
        {activeMode === 'related' ? (
          <div className="flex flex-col gap-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#40484b] leading-relaxed">
                <strong className="text-[#003441] font-semibold">{relatedDocuments.length} tài liệu liên quan</strong> đến "{currentDocument?.fileName || 'tài liệu hiện tại'}"
              </div>
            </div>

            {/* List of Related Documents & Links */}
            {relatedDocuments.map((doc) => {
              let iconName = 'analytics';
              let iconBg = 'bg-[#eff4ff] border-[#c0c8cb] text-[#003441]';
              let badgeBg = 'bg-[#77f4e2]/30 text-[#006f64] border-[#006f64]/20';

              if (doc.fileType === 'YouTube') {
                iconName = 'smart_display';
                iconBg = 'bg-red-50 border-red-200 text-red-600';
                badgeBg = 'bg-red-100 text-red-700 border-red-300';
              } else if (doc.fileType === 'Web') {
                iconName = 'language';
                iconBg = 'bg-blue-50 border-blue-200 text-blue-600';
                badgeBg = 'bg-blue-100 text-blue-700 border-blue-300';
              } else if (doc.fileType === 'Excel') {
                iconName = 'table_chart';
                iconBg = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              } else if (doc.fileType === 'PPT') {
                iconName = 'slideshow';
                iconBg = 'bg-amber-50 border-amber-200 text-amber-700';
                badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
              }

              const isExternal = doc.fileType === 'Web' || doc.fileType === 'YouTube' || Boolean(doc.url);

              return (
                <div
                  key={doc.id}
                  className="bg-white border border-[#c0c8cb] rounded-xl p-3.5 flex flex-col gap-3 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-11 rounded-lg flex items-center justify-center shrink-0 border ${iconBg}`}>
                      <span className="material-symbols-outlined text-xl">{iconName}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs text-[#0b1c30] truncate">{doc.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#40484b]">
                        <span className="material-symbols-outlined text-xs">
                          {doc.fileType === 'YouTube' ? 'subscriptions' : doc.fileType === 'Web' ? 'public' : 'folder'}
                        </span>
                        <span>{doc.department}</span>
                        <span>•</span>
                        <span className="font-semibold">{doc.fileType}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${badgeBg}`}>
                      {doc.matchPercentage}% Phù hợp
                    </span>
                  </div>

                  <div className="text-xs text-[#40484b] leading-relaxed line-clamp-2 border-l-2 border-[#5adac9] pl-2.5 bg-[#eff4ff]/50 py-1 rounded-r">
                    {doc.snippet}
                  </div>

                  <div className="flex justify-end items-center gap-2 pt-2 border-t border-[#c0c8cb]/40">
                    <button
                      onClick={() => {
                        if (isExternal && doc.url) {
                          window.open(doc.url, '_blank', 'noopener,noreferrer');
                        } else {
                          onOpenRelatedDoc(doc.id);
                        }
                      }}
                      className={`text-xs font-semibold rounded px-3 py-1 flex items-center gap-1 transition-colors border ${
                        doc.fileType === 'YouTube'
                          ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                          : doc.fileType === 'Web'
                          ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                          : 'text-[#003441] border-[#003441] hover:bg-[#eff4ff]'
                      }`}
                    >
                      <span>
                        {doc.fileType === 'YouTube' ? 'Xem Video YouTube' : doc.fileType === 'Web' ? 'Truy cập trang Web' : 'Mở tài liệu'}
                      </span>
                      <span className="material-symbols-outlined text-xs">
                        {isExternal ? 'open_in_new' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Normal Chat & Assistant Message Flow */
          <>
            {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-2">
              {msg.sender === 'user' ? (
                /* User Message */
                <div className="flex gap-2.5 max-w-[90%] self-end flex-row-reverse">
                  <div className="w-8 h-8 rounded-full border border-[#c0c8cb] overflow-hidden shrink-0 shadow-xs">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDR5wUohsvZvb1YIUrg1yWQEfv2IiHH9sVRinPu3oBIjDSH0aJyHgMi0b7c75DyXC3Sa2xPnZmP9lRQeYNJ0htztkIPNsHxkST6xRpWGRL_SviyyjjHHp7fQsBAVxNOJjTS_wTzSsFC6rV881sMCHqDQj83x3P6lu7qoN1y1NADbsPwAS2MknyDs4jqE1WPOWZgrLy4D5KY_cRiemPB5PXCgELWoK9TPtXxsCfQZZdqucE__7Q69nLLag"
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="bg-[#003441] text-white p-3.5 rounded-2xl rounded-tr-sm text-xs sm:text-sm leading-relaxed shadow-xs">
                    {msg.quote && (
                      <div className="text-xs text-[#b6ebfe] mb-2 border-l-2 border-[#006a60] pl-2 bg-white/10 p-1.5 rounded-r">
                        <span className="material-symbols-outlined text-xs mr-1 align-middle">
                          format_quote
                        </span>
                        "{msg.quote}"
                      </div>
                    )}
                    <div>{msg.text}</div>
                  </div>
                </div>
              ) : (
                /* AI Message */
                <div className="flex gap-2.5 max-w-[95%] self-start">
                  <div className="w-8 h-8 rounded-full bg-[#0f4c5c] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <span className="material-symbols-outlined text-base">smart_toy</span>
                  </div>

                  <div className="flex-1 flex flex-col gap-3">
                    {/* Summary Type Message */}
                    {msg.type === 'summary' && msg.summaryData ? (
                      <div className="bg-[#434648]/5 border border-[#c0c8cb] text-[#0b1c30] p-4 rounded-2xl rounded-tl-sm text-xs sm:text-sm shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-[#006a60]">
                            <span className="material-symbols-outlined text-lg">
                              {msg.summaryData.mindmap || msg.summaryData.isWorkflow ? 'account_tree' : 'auto_awesome'}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              {msg.summaryData.mindmap || msg.summaryData.isWorkflow ? 'Sơ đồ Mindmap Workflow' : 'AI Summary Generated'}
                            </span>
                          </div>
                          {(msg.summaryData.mindmap || msg.summaryData.isWorkflow) && (
                            <span className="bg-[#006a60]/10 text-[#006a60] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#006a60]/20">
                              Flowchart & Mindmap
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-[#003441] mb-2">
                          {msg.summaryData.title}
                        </h3>

                        <p className="mb-3 text-[#0b1c30] leading-relaxed">
                          {msg.summaryData.description}
                        </p>

                        {/* Mindmap Diagram View */}
                        {msg.summaryData.mindmap || msg.summaryData.isWorkflow ? (
                          <div className="my-4 bg-gradient-to-br from-[#f0f7f6] to-[#e6f3f1] p-3.5 rounded-xl border border-[#006a60]/30 shadow-xs flex flex-col gap-3">
                            {/* Central Root Node */}
                            <div className="self-center bg-[#003441] text-white py-2 px-4 rounded-xl shadow-md border border-[#77f4e2]/40 flex items-center gap-2 max-w-full text-center">
                              <span className="material-symbols-outlined text-[#77f4e2] text-base shrink-0">account_tree</span>
                              <span className="font-bold text-xs sm:text-sm text-[#77f4e2] truncate">
                                {msg.summaryData.mindmap?.root || msg.summaryData.title}
                              </span>
                            </div>

                            {/* Connecting Line from Root */}
                            <div className="w-0.5 h-3 bg-[#006a60]/40 self-center"></div>

                            {/* Mindmap Branches Tree */}
                            <div className="grid grid-cols-1 gap-2.5">
                              {(msg.summaryData.mindmap?.branches || [
                                {
                                  title: 'Bước 1: Khởi tạo & Thu thập',
                                  subitems: ['Thu thập báo cáo & chứng từ', 'Xác minh thông tin tài liệu']
                                },
                                {
                                  title: 'Bước 2: Phân tích & Tối ưu',
                                  subitems: ['Đánh giá các chỉ số chính', 'Xác định giải pháp tối ưu']
                                },
                                {
                                  title: 'Bước 3: Thực thi & Triển khai',
                                  subitems: ['Giải ngân ngân sách CapEx', 'Mở rộng quy mô hạ tầng']
                                }
                              ]).map((branch, bIdx) => (
                                <div key={bIdx} className="bg-white rounded-lg p-2.5 border border-[#006a60]/20 shadow-2xs flex flex-col gap-1.5 transition-all hover:border-[#006a60]/50">
                                  {/* Branch Title Badge */}
                                  <div className="flex items-center gap-2 text-xs font-bold text-[#003441] bg-[#006a60]/10 px-2 py-1 rounded-md border-l-3 border-[#006a60]">
                                    <span className="w-4 h-4 rounded-full bg-[#006a60] text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                                      {bIdx + 1}
                                    </span>
                                    <span>{branch.title}</span>
                                  </div>

                                  {/* Branch Children / Subitems */}
                                  <div className="pl-3 ml-2 border-l-2 border-dashed border-[#006a60]/30 flex flex-col gap-1 pt-0.5">
                                    {branch.subitems.map((sub, sIdx) => (
                                      <div key={sIdx} className="flex items-start gap-1.5 text-xs text-[#40484b]">
                                        <span className="text-[#006a60] font-bold text-[10px] mt-0.5 shrink-0">└─</span>
                                        <span className="leading-tight">{sub}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Standard Bullet List View */
                          <div className="mb-3">
                            <h4 className="font-semibold text-xs text-[#003441] mb-2">Key Takeaways</h4>
                            <ul className="space-y-2">
                              {msg.summaryData.takeaways.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="material-symbols-outlined text-[#006a60] text-sm mt-0.5 shrink-0">
                                    check_circle
                                  </span>
                                  <span className="text-xs leading-normal">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="bg-[#eff4ff] p-3 rounded-lg border border-[#d3e4fe]">
                          <h4 className="font-semibold text-xs text-[#003441] mb-1">Conclusion</h4>
                          <p className="text-xs text-[#40484b] leading-relaxed">
                            {msg.summaryData.conclusion}
                          </p>
                        </div>

                      
                      </div>
                    ) : msg.type === 'quiz' && msg.quizData ? (
                      /* Quiz Type Message */
                      <div className="bg-white border border-[#c0c8cb] rounded-xl shadow-xs overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#c0c8cb] bg-[#f8f9ff] flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#006a60]">
                              psychology
                            </span>
                            <h3 className="font-semibold text-xs text-[#0b1c30]">
                              Kiểm tra kiến thức
                            </h3>
                          </div>
                          <span className="bg-[#77f4e2]/30 text-[#006f64] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            Câu {msg.quizData.questionNumber} / {msg.quizData.totalQuestions}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-[#d3e4fe]">
                          <div
                            style={{
                              width: `${(msg.quizData.questionNumber / msg.quizData.totalQuestions) * 100}%`,
                            }}
                            className="h-full bg-[#006a60] rounded-r-full transition-all duration-300"
                          ></div>
                        </div>

                        <div className="p-4">
                          <p className="font-semibold text-xs sm:text-sm text-[#0b1c30] mb-3 leading-snug">
                            <span className="text-[#006a60] mr-1">
                              Q{msg.quizData.questionNumber}.
                            </span>
                            {msg.quizData.question}
                          </p>

                          <div className="space-y-2">
                            {msg.quizData.options.map((opt, optIdx) => {
                              const isSelected = msg.quizData?.selectedIndex === optIdx;
                              const isCorrectOpt = msg.quizData?.correctIndex === optIdx;
                              const isChecked = msg.quizData?.isChecked;

                              let optionStyle = 'border-[#c0c8cb] hover:bg-[#eff4ff] text-[#40484b]';
                              if (isChecked) {
                                if (isCorrectOpt) {
                                  optionStyle = 'border-2 border-[#006a60] bg-[#77f4e2]/25 font-bold text-[#003441]';
                                } else if (isSelected && !isCorrectOpt) {
                                  optionStyle = 'border-2 border-red-500 bg-red-50 font-medium text-red-900';
                                } else {
                                  optionStyle = 'border-[#c0c8cb] opacity-50 text-[#40484b]';
                                }
                              } else if (isSelected) {
                                optionStyle = 'border-2 border-[#006a60] bg-[#006a60]/5 font-medium text-[#0b1c30]';
                              }

                              return (
                                <label
                                  key={optIdx}
                                  onClick={() => !isChecked && onSelectQuizOption(msg.id, optIdx)}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${optionStyle}`}
                                >
                                  <input
                                    type="radio"
                                    name={`quiz-${msg.id}`}
                                    checked={isSelected}
                                    disabled={isChecked}
                                    onChange={() => {}}
                                    className="mt-0.5 text-[#006a60] focus:ring-[#006a60]"
                                  />
                                  <span className="leading-normal flex-1">{opt}</span>
                                  {isChecked && isCorrectOpt && (
                                    <span className="material-symbols-outlined text-base text-[#006a60] font-bold">check_circle</span>
                                  )}
                                  {isChecked && isSelected && !isCorrectOpt && (
                                    <span className="material-symbols-outlined text-base text-red-500 font-bold">cancel</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>

                          {msg.quizData.isChecked ? (
                            <div
                              className={`mt-3 p-3 rounded-lg text-xs leading-relaxed border ${
                                msg.quizData.selectedIndex === msg.quizData.correctIndex
                                  ? 'bg-[#77f4e2]/20 border-[#006a60] text-[#003441]'
                                  : 'bg-amber-50 border-amber-300 text-amber-900'
                              }`}
                            >
                              <div className="font-bold flex items-center gap-1.5 mb-1">
                                <span className="material-symbols-outlined text-base">
                                  {msg.quizData.selectedIndex === msg.quizData.correctIndex ? 'check_circle' : 'error'}
                                </span>
                                <span>
                                  {msg.quizData.selectedIndex === msg.quizData.correctIndex
                                    ? 'Chính xác! Bạn đã chọn đúng đáp án.'
                                    : `Chưa chính xác! Đáp án đúng là Lựa chọn ${String.fromCharCode(65 + msg.quizData.correctIndex)}.`}
                                </span>
                              </div>
                              <div>
                                <strong>Giải thích chi tiết:</strong> {msg.quizData.explanation}
                              </div>
                            </div>
                          ) : msg.quizData.explanation ? (
                            <div className="mt-3 p-3 bg-[#eff4ff] rounded-lg text-xs text-[#0b1c30] border border-[#d3e4fe]">
                              <strong>Gợi ý:</strong> {msg.quizData.explanation}
                            </div>
                          ) : null}

                          {!msg.quizData.isChecked ? (
                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={() => onCheckQuizAnswer(msg.id)}
                                className="bg-[#003441] hover:bg-[#0f4c5c] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                              >
                                <span>Kiểm tra đáp án</span>
                                <span className="material-symbols-outlined text-sm">
                                  arrow_forward
                                </span>
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 pt-3 border-t border-[#c0c8cb]/40 flex items-center justify-between">
                              <div className="text-[11px] text-[#006a60] font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                <span>Đã trả lời câu {msg.quizData.questionNumber}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onGenerateQuiz) {
                                    onGenerateQuiz({ scope: quizScope, difficulty: quizDifficulty });
                                  }
                                  scrollToBottom();
                                }}
                                disabled={isLoading}
                                className="bg-[#006a60] hover:bg-[#00524a] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                              >
                                <span>{isLoading ? 'Đang tạo câu tiếp...' : 'Câu tiếp theo'}</span>
                                <span className="material-symbols-outlined text-base">
                                  navigate_next
                                </span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="px-4 py-2 bg-[#eff4ff] border-t border-[#c0c8cb] flex items-center justify-between text-[11px] text-[#40484b]">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">info</span>
                            Trích xuất từ Trang {msg.quizData.pageSource}
                          </span>
            
                        </div>
                      </div>
                    ) : (
                      /* Standard Text Answer Message */
                      <div className="bg-[#434648] text-white p-4 rounded-2xl rounded-tl-sm text-xs sm:text-sm leading-relaxed shadow-xs">
                        <div
                          className="prose prose-invert max-w-none text-xs sm:text-sm"
                          dangerouslySetInnerHTML={{
                            __html: (msg.text || '')
                              .replace(/\n/g, '<br/>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                          }}
                        />


                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          </>
        )}

        {/* Loading Spinner Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#006a60] p-2 bg-[#eff4ff] rounded-lg border border-[#d3e4fe] animate-pulse">
            <span className="material-symbols-outlined text-base animate-spin">sync</span>
            <span>DocuMind AI đang phân tích dữ liệu...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Area */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#c0c8cb] shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-end">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the document..."
            rows={1}
            className="w-full bg-[#f8f9ff] border border-[#c0c8cb] rounded-xl py-2.5 pl-3.5 pr-12 text-xs sm:text-sm text-[#0b1c30] placeholder-[#40484b]/70 focus:outline-none focus:border-[#006a60] focus:ring-2 focus:ring-[#006a60]/20 transition-all resize-none min-h-[44px] max-h-[100px]"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 bg-[#003441] text-white rounded-lg hover:bg-[#0f4c5c] disabled:opacity-40 transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-base">send</span>
          </button>
        </form>

        <div className="text-center mt-2">
          <span className="text-[10px] text-[#40484b] opacity-70">
            DocuMind AI can make mistakes. Consider verifying important information.
          </span>
        </div>
      </div>
    </aside>
  );
};
