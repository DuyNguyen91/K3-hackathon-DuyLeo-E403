import React, { useState } from 'react';
import { DocumentItem } from '../types';

interface TopNavBarProps {
  activeTab: 'workspace' | 'documents' | 'library';
  setActiveTab: (tab: 'workspace' | 'documents' | 'library') => void;
  onUploadClick: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentDocument: DocumentItem | null;
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
  onOpenProviderSettings?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  setActiveTab,
  onUploadClick,
  searchQuery,
  setSearchQuery,
  currentDocument,
  documents,
  onSelectDocument,
  onOpenProviderSettings,
}) => {
  const [showDocDropdown, setShowDocDropdown] = useState(false);

  return (
    <header className="bg-[#f8f9ff] dark:bg-[#213145] border-b border-[#c0c8cb] dark:border-[#70787c] sticky top-0 z-40 w-full transition-colors">
      <div className="flex justify-between items-center w-full px-4 md:px-8 py-3 max-w-[1440px] mx-auto">
        {/* Brand & Search */}
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div
            onClick={() => setActiveTab('workspace')}
            className="text-2xl font-bold text-[#003441] dark:text-[#b6ebfe] flex items-center gap-2 cursor-pointer select-none shrink-0"
          >
            <span className="material-symbols-outlined filled text-[#006a60] text-2xl md:text-3xl">
              smart_toy
            </span>
            <span className="tracking-tight">DocuMind AI</span>
          </div>

          {/* Quick Active Document Picker */}
          {currentDocument && (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setShowDocDropdown(!showDocDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] rounded-lg border border-[#c0c8cb] transition-colors"
                title="Đổi tài liệu đang xem"
              >
                <span className="material-symbols-outlined text-sm text-[#ba1a1a]">
                  picture_as_pdf
                </span>
                <span className="truncate max-w-[160px]">{currentDocument.fileName}</span>
                <span className="material-symbols-outlined text-xs">arrow_drop_down</span>
              </button>

              {showDocDropdown && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#c0c8cb] py-2 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-[#70787c] uppercase tracking-wider">
                    Tài liệu đã mở ({documents.length})
                  </div>
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        onSelectDocument(doc);
                        setShowDocDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs hover:bg-[#eff4ff] transition-colors ${doc.id === currentDocument.id ? 'bg-[#e5eeff] font-semibold text-[#003441]' : 'text-[#0b1c30]'
                        }`}
                    >
                      <span className="material-symbols-outlined text-sm text-[#ba1a1a]">description</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{doc.fileName}</p>
                        <p className="text-[10px] text-[#40484b]">{doc.department || 'Tài liệu PDF'}</p>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-[#c0c8cb] mt-1 pt-1 px-2">
                    <button
                      onClick={() => {
                        setShowDocDropdown(false);
                        onUploadClick();
                      }}
                      className="w-full text-center py-1.5 text-xs font-medium text-[#006a60] hover:bg-[#77f4e2]/20 rounded-md transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      Tải lên / Mở PDF khác
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-2">
          {/* <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 bg-[#003441] text-white font-medium text-xs px-3.5 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">upload</span>
            <span>Upload PDF</span>
          </button> */}

          <div className="flex items-center gap-1 border-l border-[#c0c8cb] pl-2 ml-1">



            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBx5mq3FW_x12yruwH_XOTrPoMpR0PiRcuPT43ySmd2N3S7g4tqT-LDsxEtHXA7Sq-q0BNNEAZ4H6CHCML7PJRuuKNzIke0aB3-wUpS3lGjuip_kcQfIUg6S2eM7-u0ovHURBy3ry4Zrjgk5bq3I7K3PVKvqMjCDoZb_f_sogXKcB_Huc6aOymJOrpjaBDT6u-NLzfXiit3lNa-0saCD0pMPw3Ro-0ZIc7VsIZOqauBJhx4NT4xArSWYg"
              alt="User profile avatar"
              className="w-8 h-8 rounded-full ml-1 border border-[#c0c8cb] object-cover ring-2 ring-white shadow-xs"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
