import React, { useRef } from 'react';
import { DocumentItem } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleDocuments: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
  onFileUpload: (file: File) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  sampleDocuments,
  onSelectDocument,
  onFileUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-[#c0c8cb] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#c0c8cb] flex justify-between items-center bg-[#f8f9ff]">
          <div className="flex items-center gap-2 text-[#003441] font-semibold text-base">
            <span className="material-symbols-outlined text-[#006a60]">upload_file</span>
            <span>Tải lên tài liệu PDF</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#40484b] hover:bg-[#eff4ff] rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          {/* File Drag and Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#c0c8cb] hover:border-[#003441] bg-[#eff4ff]/60 hover:bg-[#eff4ff] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.xlsx"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-full bg-[#003441] text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">add</span>
            </div>
            <p className="font-semibold text-sm text-[#0b1c30]">Chọn file từ máy tính</p>
            <p className="text-xs text-[#40484b] mt-1">Hỗ trợ PDF, Excel, Word (Tối đa 50MB)</p>
          </div>

          {/* Sample Documents List */}
          <div>
            <h4 className="text-xs font-semibold text-[#70787c] uppercase tracking-wider mb-3">
              Hoặc chọn tài liệu mẫu có sẵn
            </h4>

            <div className="space-y-2">
              {sampleDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDocument(doc);
                    onClose();
                  }}
                  className="p-3 bg-[#f8f9ff] hover:bg-[#e5eeff] border border-[#c0c8cb] rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-[#ffdad6] text-[#ba1a1a] rounded-lg shrink-0">
                      <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-[#0b1c30] truncate">{doc.fileName}</p>
                      <p className="text-[11px] text-[#40484b]">{doc.department} • {doc.pageCount} trang</p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#006a60] hover:underline shrink-0">
                    Mở ngay →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#c0c8cb] bg-[#f8f9ff] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-[#40484b] hover:bg-[#eff4ff] rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
