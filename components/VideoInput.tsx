import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, AlertCircle, FileVideo, Globe, Check } from 'lucide-react';
import { Language } from '../types';

interface VideoInputProps {
  onVideoSelected: (file: File, lang: Language) => void;
  onUrlSelected: (url: string, lang: Language) => void;
  isLoading: boolean;
}

const VideoInput: React.FC<VideoInputProps> = ({ onVideoSelected, onUrlSelected, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('url');
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState<Language>('zh');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSelectFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError("Please upload a valid video file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("File is too large for this browser-based demo (>25MB). Please try a shorter clip.");
      return;
    }
    setError(null);
    onVideoSelected(file, language);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    try {
      new URL(url);
    } catch (_) {
      setError("Please enter a valid URL (e.g., https://...)");
      return;
    }
    setError(null);
    onUrlSelected(url, language);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-surface rounded-xl shadow-lg border border-slate-700 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => { setActiveTab('url'); setError(null); }}
          className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${activeTab === 'url' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
        >
          <LinkIcon size={18} />
          Paste URL
        </button>
        <button
          onClick={() => { setActiveTab('upload'); setError(null); }}
          className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${activeTab === 'upload' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
        >
          <Upload size={18} />
          Upload File
        </button>
      </div>

      <div className="p-8">
        {/* Language Selection */}
        <div className="mb-6 flex justify-end">
          <div className="bg-dark border border-slate-600 rounded-lg p-1 flex gap-1">
             <button
               onClick={() => setLanguage('zh')}
               className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${language === 'zh' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >
               {language === 'zh' && <Check size={12} />} 中文
             </button>
             <button
               onClick={() => setLanguage('en')}
               className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${language === 'en' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >
               {language === 'en' && <Check size={12} />} English
             </button>
          </div>
        </div>

        {activeTab === 'url' ? (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Supported: Douyin, TikTok, Red, Facebook</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.tiktok.com/@user/video/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-dark border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !url}
                  className="bg-primary hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Analyze
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-orange-200 text-sm">{error}</p>
              </div>
            )}
            <div className="text-xs text-slate-500 mt-4 flex items-start gap-2">
               <Globe size={14} className="mt-0.5 shrink-0" />
               <span className="opacity-80">
                  AI will use search grounding to analyze the context of the URL. <br/>
                  Note: Direct video frame analysis for URLs is restricted by browser security; web search data will be used instead.
               </span>
            </div>
          </form>
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'}
              ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="bg-slate-700 p-4 rounded-full mb-4 text-primary">
              <FileVideo size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Click or drag video here</h3>
            <p className="text-slate-400 text-sm text-center max-w-xs">
              Supports MP4, MOV, WebM. <br/> Max 25MB for this browser demo.
            </p>
            {error && (
              <div className="mt-4 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoInput;