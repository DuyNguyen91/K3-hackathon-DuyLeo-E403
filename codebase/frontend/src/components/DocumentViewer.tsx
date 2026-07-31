import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../types';
import { PdfJsViewer } from './PdfJsViewer';

interface DocumentViewerProps {
  document: DocumentItem | null;
  onUploadClick: () => void;
  onExplainSnippet: (
    text: string,
    context?: { slideTitle?: string; pageNumber?: number; sectionHeading?: string; pageContext?: string }
  ) => void;
  onPageChange: (newPage: number) => void;
  onZoomChange: (newZoom: number) => void;
  onFileUpload: (file: File) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onUploadClick,
  onExplainSnippet,
  onPageChange,
  onZoomChange,
  onFileUpload,
}) => {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>('p-2');
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'extracted'>('pdf');

  useEffect(() => {
    if (document?.fileUrl) {
      setViewMode('pdf');
    } else {
      setViewMode('extracted');
    }
  }, [document?.id, document?.fileUrl]);

  // Collect full text content of current slide/page for context
  const getSlideContext = (heading?: string) => {
    if (!document) return {};
    const pageContext = document.content.sections
      .map((s) => `[Mục: ${s.heading}]\n${s.paragraphs.map((p) => p.text).join('\n')}`)
      .join('\n\n');

    return {
      slideTitle: document.content.title || document.title,
      pageNumber: document.currentPage,
      sectionHeading: heading || document.content.sections[0]?.heading || '',
      pageContext: pageContext,
    };
  };

  // Handle native text selection inside document
  const handleTextSelection = (e: React.MouseUpEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length >= 3) {
      setSelectedText(text);
      
      // Calculate selection position or fallback to mouse position
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTooltipPos({
            x: rect.left + rect.width / 2,
            y: Math.max(20, rect.top - 48),
          });
          return;
        }
      }
      setTooltipPos({ x: e.clientX, y: e.clientY - 45 });
    } else {
      setSelectedText(null);
      setTooltipPos(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  if (!document) {
    return (
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 border-r border-[#c0c8cb] p-6 md:p-12 flex items-center justify-center relative overflow-hidden bg-[#ffffff] transition-all ${
          isDraggingOver ? 'bg-[#eff4ff] border-2 border-dashed border-[#003441]' : ''
        }`}
      >
        <div className="max-w-md w-full p-8 border-2 border-dashed border-[#c0c8cb] rounded-xl bg-[#f8f9ff] flex flex-col items-center justify-center text-center shadow-[0_4px_12px_rgba(15,76,92,0.05)] hover:border-[#003441] hover:bg-[#eff4ff] transition-all">
          <div className="w-20 h-20 rounded-full bg-[#0f4c5c] text-white flex items-center justify-center mb-6 shadow-sm">
            <span className="material-symbols-outlined text-4xl filled">upload_file</span>
          </div>
          <h3 className="font-semibold text-xl text-[#0b1c30] mb-2">Chưa có tài liệu</h3>
          <p className="text-xs text-[#40484b] mb-8 leading-relaxed max-w-xs">
            Kéo thả file PDF vào đây hoặc nhấn nút bên dưới để bắt đầu phân tích.
          </p>
          <button
            onClick={onUploadClick}
            className="bg-[#003441] text-white px-6 py-3 rounded-lg hover:bg-[#0f4c5c] transition-all font-semibold text-sm flex items-center gap-2 shadow-sm hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Tải lên PDF</span>
          </button>
          <p className="text-[11px] text-[#40484b] mt-4 opacity-70">Hỗ trợ PDF tối đa 50MB</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-white rounded-xl border border-[#c0c8cb] shadow-sm flex flex-col overflow-hidden relative">
      {/* Document Viewer Header Toolbar */}
      <div className="border-b border-[#c0c8cb] px-4 py-3 flex justify-between items-center bg-[#f8f9ff] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-[#ffdad6] text-[#ba1a1a] rounded-md shrink-0">
            <span className="material-symbols-outlined filled text-xl">picture_as_pdf</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm text-[#0b1c30] truncate">{document.fileName}</h1>
            <p className="text-[11px] text-[#40484b]">
              Page {document.currentPage} of {document.pageCount} • {document.zoom}% Zoom
            </p>
          </div>

          {document.fileUrl && (
            <div className="flex items-center bg-[#e5eeff] p-0.5 rounded-lg border border-[#c0c8cb] text-xs font-semibold ml-2">
              <button
                onClick={() => setViewMode('pdf')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'pdf'
                    ? 'bg-[#003441] text-white shadow-xs font-semibold'
                    : 'text-[#40484b] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span>PDF Gốc</span>
              </button>
              <button
                onClick={() => setViewMode('extracted')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'extracted'
                    ? 'bg-[#003441] text-white shadow-xs font-semibold'
                    : 'text-[#40484b] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span>Nội dung AI</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onZoomChange(Math.max(50, document.zoom - 10))}
            className="p-1.5 text-[#40484b] hover:bg-[#e5eeff] hover:text-[#0b1c30] rounded-md transition-colors"
            title="Thu nhỏ"
          >
            <span className="material-symbols-outlined text-lg">zoom_out</span>
          </button>
          <span className="text-xs text-[#40484b] font-medium px-1 min-w-[40px] text-center">
            {document.zoom}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(200, document.zoom + 10))}
            className="p-1.5 text-[#40484b] hover:bg-[#e5eeff] hover:text-[#0b1c30] rounded-md transition-colors"
            title="Phóng to"
          >
            <span className="material-symbols-outlined text-lg">zoom_in</span>
          </button>

          <div className="w-px h-5 bg-[#c0c8cb] mx-1.5"></div>

          <button
            onClick={() => onPageChange(Math.max(1, document.currentPage - 1))}
            disabled={document.currentPage <= 1}
            className="p-1.5 text-[#40484b] disabled:opacity-40 hover:bg-[#e5eeff] rounded-md transition-colors"
            title="Trang trước"
          >
            <span className="material-symbols-outlined text-lg">navigate_before</span>
          </button>
          <button
            onClick={() => onPageChange(Math.min(document.pageCount, document.currentPage + 1))}
            disabled={document.currentPage >= document.pageCount}
            className="p-1.5 text-[#40484b] disabled:opacity-40 hover:bg-[#e5eeff] rounded-md transition-colors"
            title="Trang sau"
          >
            <span className="material-symbols-outlined text-lg">navigate_next</span>
          </button>

          <div className="w-px h-5 bg-[#c0c8cb] mx-1.5 hidden sm:block"></div>

          <button
            onClick={() => {
              if (document.fileUrl) {
                const a = window.document.createElement('a');
                a.href = document.fileUrl;
                a.download = document.fileName;
                a.click();
              } else {
                alert(`Đang tải xuống ${document.fileName}`);
              }
            }}
            className="p-1.5 text-[#40484b] hover:bg-[#e5eeff] hover:text-[#0b1c30] rounded-md transition-colors hidden sm:block"
            title="Tải xuống PDF"
          >
            <span className="material-symbols-outlined text-lg">download</span>
          </button>
          <button
            onClick={() => window.print()}
            className="p-1.5 text-[#40484b] hover:bg-[#e5eeff] hover:text-[#0b1c30] rounded-md transition-colors hidden sm:block"
            title="In tài liệu"
          >
            <span className="material-symbols-outlined text-lg">print</span>
          </button>
        </div>
      </div>

      {/* Floating Selection Tooltip */}
      {selectedText && tooltipPos && (
        <div
          style={{ top: `${tooltipPos.y}px`, left: `${tooltipPos.x}px` }}
          className="fixed -translate-x-1/2 z-50 bg-[#003441] text-white px-3.5 py-2 rounded-xl text-xs font-medium shadow-2xl flex items-center gap-2 border border-[#006a60] animate-in fade-in zoom-in-95 pointer-events-auto"
        >
          <button
            onClick={() => {
              onExplainSnippet(selectedText, getSlideContext());
              setSelectedText(null);
            }}
            className="flex items-center gap-2 text-white hover:text-[#77f4e2] font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base text-[#77f4e2] filled">psychology</span>
            <span>Giải thích đoạn này</span>
            <span className="bg-[#006a60] text-[#77f4e2] text-[10px] px-1.5 py-0.5 rounded font-bold">
              Chatbot AI
            </span>
          </button>
          <button
            onClick={() => setSelectedText(null)}
            className="text-[#9acee1] hover:text-white ml-1.5 text-xs p-1 rounded-full hover:bg-white/10"
            title="Đóng"
          >
            ✕
          </button>
        </div>
      )}

      {/* Document Content Page */}
      {viewMode === 'pdf' && document.fileUrl ? (
        <PdfJsViewer
          fileUrl={document.fileUrl}
          initialPage={document.currentPage}
          zoom={document.zoom}
          onPageChange={onPageChange}
        />
      ) : (
        <div
          onMouseUp={handleTextSelection}
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#eff4ff] flex justify-center selection:bg-[#9acee1]"
        >
          <div
            style={{ transform: `scale(${document.zoom / 100})`, transformOrigin: 'top center' }}
            className="bg-white shadow-[0_4px_16px_rgba(15,76,92,0.06)] w-full max-w-3xl min-h-[850px] p-6 sm:p-12 text-[#0b1c30] rounded-lg border border-[#c0c8cb] transition-transform duration-200"
          >
            {/* Title Header */}
            <div className="border-b border-[#c0c8cb] pb-4 mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#003441] tracking-tight">
                {document.content.title}
              </h2>
              {document.content.subtitle && (
                <p className="text-xs sm:text-sm text-[#40484b] mt-1 font-medium">
                  {document.content.subtitle}
                </p>
              )}
            </div>

            {/* Sections */}
            {document.content.sections.map((sec) => (
              <div key={sec.id} className="mb-8">
                {sec.heading && sec.heading !== document.content.title && (
                  <h3 className="text-lg font-semibold text-[#0b1c30] mb-3 border-l-4 border-[#006a60] pl-3 py-0.5 bg-[#eff4ff]/60 rounded-r">
                    {sec.heading}
                  </h3>
                )}

                {sec.paragraphs.map((para) => {
                  const isHighlight = para.isHighlighted || activeHighlightId === para.id;

                  return (
                    <div key={para.id} className="mb-4">
                      <p className="text-sm sm:text-base text-[#40484b] leading-relaxed text-justify">
                        {isHighlight ? (
                          <span
                            onClick={() => {
                              setActiveHighlightId(para.id);
                              onExplainSnippet(para.text, getSlideContext(sec.heading));
                            }}
                            className="highlight-text active group inline-block p-1 rounded transition-colors"
                          >
                            <span className="tooltip-action group-hover:opacity-100 opacity-100">
                              <span className="material-symbols-outlined text-[16px]">psychology</span>
                              <span>{para.highlightText || 'Giải thích đoạn này'}</span>
                            </span>
                            {para.text}
                          </span>
                        ) : (
                          para.text
                        )}
                      </p>
                    </div>
                  );
                })}

                {/* Table if present */}
                {sec.table && (
                  <div className="my-6 overflow-x-auto border border-[#c0c8cb] rounded-lg p-3 bg-[#eff4ff]/40">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-[#c0c8cb]">
                          {sec.table.headers.map((h, idx) => (
                            <th key={idx} className="py-2 px-3 text-[#40484b] font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sec.table.rows.map((r, idx) => (
                          <tr key={idx} className="border-b border-[#c0c8cb]/60 border-dashed hover:bg-[#e5eeff]/50 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-[#0b1c30]">{r.label}</td>
                            <td className="py-2.5 px-3 text-right">{r.q3_2023}</td>
                            <td className="py-2.5 px-3 text-right">{r.q3_2022}</td>
                            <td
                              className={`py-2.5 px-3 text-right font-semibold ${
                                r.isPositive
                                  ? 'text-[#006a60]'
                                  : r.isNegative
                                  ? 'text-[#ba1a1a]'
                                  : 'text-[#0b1c30]'
                              }`}
                            >
                              {r.change}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Chart if present */}
                {sec.chart && (
                  <div className="w-full h-52 bg-[#e5eeff] border border-[#c0c8cb] rounded-lg my-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
                    {sec.chart.imageUrl ? (
                      <img
                        src={sec.chart.imageUrl}
                        alt={sec.chart.title}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#40484b]">
                        <span className="material-symbols-outlined text-4xl mb-1">bar_chart</span>
                        <span className="text-xs font-medium">{sec.chart.title}</span>
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 z-10 font-medium text-[11px] text-[#0b1c30] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded shadow-xs">
                      {sec.chart.title}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
