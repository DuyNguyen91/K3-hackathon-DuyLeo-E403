import React, { useState, useEffect } from 'react';

interface AIProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AIProviderModal: React.FC<AIProviderModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [providerType, setProviderType] = useState<string>('gemini');
  const [baseUrl, setBaseUrl] = useState<string>('https://generativelanguage.googleapis.com/v1beta');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState<string>('');
  const [maskedKey, setMaskedKey] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch current provider config
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/provider');
      const data = await res.json();
      if (data.success && data.config) {
        setProviderType(data.config.provider_type || 'gemini');
        setBaseUrl(data.config.base_url || 'https://generativelanguage.googleapis.com/v1beta');
        setModel(data.config.model || 'gemini-2.5-flash');
        setMaskedKey(data.config.api_key_masked || '');
        setIsConfigured(data.config.configured || false);
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình provider:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      setMessage(null);
      setApiKey('');
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: any = {
        provider_type: providerType,
        base_url: baseUrl,
        model: model,
      };
      if (apiKey.trim()) {
        payload.api_key = apiKey.trim();
      }

      const res = await fetch('/api/ai/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Lưu cấu hình Provider tùy chỉnh thành công!', type: 'success' });
        setIsConfigured(data.config?.configured ?? true);
        if (data.config?.api_key_masked) {
          setMaskedKey(data.config.api_key_masked);
        }
        setApiKey('');
        if (onSaved) onSaved();
      } else {
        setMessage({ text: data.error || 'Cập nhật thất bại!', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi kết nối tới server', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const presets = [
    {
      name: 'Google Gemini Native',
      type: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-flash',
    },
    {
      name: 'OpenAI (GPT-4o / GPT-4o-mini)',
      type: 'openai_compatible',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    },
    {
      name: 'DeepSeek (OpenAI Compatible)',
      type: 'openai_compatible',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    },
    {
      name: 'Groq Cloud (Llama 3.3)',
      type: 'openai_compatible',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
    },
    {
      name: 'OpenRouter / Local / Ollama',
      type: 'openai_compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.3-70b-instruct',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#1a2836] rounded-2xl shadow-2xl border border-[#c0c8cb] dark:border-[#40484b] w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#003441] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#77f4e2] text-2xl filled">
              settings_input_component
            </span>
            <div>
              <h2 className="font-bold text-base leading-tight">Cấu hình Custom AI Provider</h2>
              <p className="text-[11px] text-[#9acee1]">Sử dụng Provider tùy chỉnh (OpenAI Compatible hoặc Gemini Native)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9acee1] hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {loading ? (
            <div className="py-8 text-center text-[#40484b] dark:text-[#9acee1] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin">sync</span>
              <span>Đang tải thông tin cấu hình...</span>
            </div>
          ) : (
            <>
              {/* Presets */}
              <div>
                <label className="block font-semibold text-[#0b1c30] dark:text-[#b6ebfe] mb-1.5">
                  Chọn mẫu Provider phổ biến:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setProviderType(p.type);
                        setBaseUrl(p.baseUrl);
                        setModel(p.model);
                      }}
                      className="p-2 text-left rounded-lg border border-[#c0c8cb] dark:border-[#40484b] hover:border-[#006a60] dark:hover:border-[#77f4e2] hover:bg-[#eff4ff] dark:hover:bg-white/5 transition-all text-[11px]"
                    >
                      <div className="font-bold text-[#003441] dark:text-[#77f4e2]">{p.name}</div>
                      <div className="text-[10px] text-[#70787c] dark:text-[#9acee1] truncate">{p.model}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Type */}
              <div>
                <label className="block font-semibold text-[#0b1c30] dark:text-[#b6ebfe] mb-1">
                  Loại Provider API:
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-[#c0c8cb] dark:border-[#40484b] flex-1">
                    <input
                      type="radio"
                      name="providerType"
                      value="gemini"
                      checked={providerType === 'gemini'}
                      onChange={(e) => setProviderType(e.target.value)}
                      className="accent-[#006a60]"
                    />
                    <span className="font-semibold text-[#0b1c30] dark:text-white">Gemini Native</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-[#c0c8cb] dark:border-[#40484b] flex-1">
                    <input
                      type="radio"
                      name="providerType"
                      value="openai_compatible"
                      checked={providerType === 'openai_compatible'}
                      onChange={(e) => setProviderType(e.target.value)}
                      className="accent-[#006a60]"
                    />
                    <span className="font-semibold text-[#0b1c30] dark:text-white">OpenAI Compatible</span>
                  </label>
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="block font-semibold text-[#0b1c30] dark:text-[#b6ebfe] mb-1">
                  Base Endpoint URL:
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://generativelanguage.googleapis.com/v1beta"
                  className="w-full p-2.5 rounded-lg border border-[#c0c8cb] dark:border-[#40484b] bg-white dark:bg-[#0b1c30] text-[#0b1c30] dark:text-white focus:outline-none focus:border-[#006a60] dark:focus:border-[#77f4e2]"
                  required
                />
              </div>

              {/* Model */}
              <div>
                <label className="block font-semibold text-[#0b1c30] dark:text-[#b6ebfe] mb-1">
                  Mô hình AI (Model Name):
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gemini-2.5-flash hoặc gpt-4o"
                  className="w-full p-2.5 rounded-lg border border-[#c0c8cb] dark:border-[#40484b] bg-white dark:bg-[#0b1c30] text-[#0b1c30] dark:text-white focus:outline-none focus:border-[#006a60] dark:focus:border-[#77f4e2]"
                  required
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block font-semibold text-[#0b1c30] dark:text-[#b6ebfe] mb-1">
                  API Key:
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={maskedKey ? `Đã cấu hình (${maskedKey}) - Để trống nếu không đổi` : 'Nhập API Key mới...'}
                  className="w-full p-2.5 rounded-lg border border-[#c0c8cb] dark:border-[#40484b] bg-white dark:bg-[#0b1c30] text-[#0b1c30] dark:text-white focus:outline-none focus:border-[#006a60] dark:focus:border-[#77f4e2]"
                />
                {maskedKey && (
                  <p className="text-[10px] text-[#006a60] dark:text-[#77f4e2] mt-1 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span>Khóa hiện tại: {maskedKey}</span>
                  </p>
                )}
              </div>

              {/* Message Banner */}
              {message && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium ${
                    message.type === 'success'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Footer buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#c0c8cb] dark:border-[#40484b]">
                <div className="flex items-center gap-1 text-[11px] text-[#40484b] dark:text-[#9acee1]">
                  <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span>{isConfigured ? 'Đã sẵn sàng' : 'Chưa thiết lập Key'}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-[#c0c8cb] text-[#40484b] dark:text-[#9acee1] hover:bg-[#eff4ff] transition-colors font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-[#006a60] text-white hover:bg-[#005149] font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                    <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
