import React, { useState, useEffect } from 'react';
import { X, Save, Shield, HelpCircle, ExternalLink, ChevronDown, ChevronRight, FolderInput, Globe, Wand2, Lock } from 'lucide-react';
import { FeishuConfig } from '../types';
import { isSystemConfigured } from '../config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: FeishuConfig) => void;
  currentConfig: FeishuConfig;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
  const [appId, setAppId] = useState(currentConfig.appId);
  const [appSecret, setAppSecret] = useState(currentConfig.appSecret);
  const [defaultFolderToken, setDefaultFolderToken] = useState(currentConfig.defaultFolderToken || '');
  const [proxyUrl, setProxyUrl] = useState(currentConfig.proxyUrl || '');
  const [showGuide, setShowGuide] = useState(false);

  const hasSystem = isSystemConfigured();

  // Reset local state when modal opens or config changes
  useEffect(() => {
    if (isOpen) {
      setAppId(currentConfig.appId);
      setAppSecret(currentConfig.appSecret);
      setDefaultFolderToken(currentConfig.defaultFolderToken || '');
      setProxyUrl(currentConfig.proxyUrl || '');
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ appId, appSecret, defaultFolderToken, proxyUrl });
    onClose();
  };

  const fillDefaultProxy = () => {
    setProxyUrl('https://cors-anywhere.herokuapp.com/');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-lg ${hasSystem ? 'bg-green-500' : 'bg-[#00D6B9]'} flex items-center justify-center text-dark`}>
            {hasSystem ? <Lock size={24} /> : <Shield size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Feishu Sync Configuration</h3>
            <p className="text-xs text-slate-400">Configure credentials to export analysis to Feishu Docs</p>
          </div>
        </div>

        {hasSystem && (
           <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
             <div className="flex items-start gap-3">
               <CheckCircleIcon />
               <div>
                  <h4 className="text-sm font-bold text-green-400">System Managed Mode</h4>
                  <p className="text-xs text-green-200/70 mt-1">
                    The Application ID and Secret are pre-configured by the system administrator. 
                    You do not need to enter them manually.
                  </p>
               </div>
             </div>
           </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={hasSystem ? 'opacity-50 pointer-events-none grayscale' : ''}>
            <label className="block text-sm font-medium text-slate-300 mb-1">App ID</label>
            <input 
              type="text" 
              value={hasSystem ? '•'.repeat(20) : appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="cli_..." 
              readOnly={hasSystem}
              className="w-full bg-dark border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder-slate-600"
            />
          </div>
          
          <div className={hasSystem ? 'opacity-50 pointer-events-none grayscale' : ''}>
            <label className="block text-sm font-medium text-slate-300 mb-1">App Secret</label>
            <input 
              type="password" 
              value={hasSystem ? '•'.repeat(20) : appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="••••••••••••••••" 
              readOnly={hasSystem}
              className="w-full bg-dark border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder-slate-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-700/50">
            <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
              <FolderInput size={14} className="text-[#00D6B9]" /> 
              Default Folder Token (Optional)
            </label>
            <input 
              type="text" 
              value={defaultFolderToken}
              onChange={(e) => setDefaultFolderToken(e.target.value)}
              placeholder="e.g. fldcn..." 
              className="w-full bg-dark border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder-slate-600"
            />
          </div>

          <div className={hasSystem ? 'opacity-50 pointer-events-none grayscale' : ''}>
             <div className="flex justify-between items-end mb-1">
               <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                 <Globe size={14} className="text-[#00D6B9]" /> 
                 CORS Proxy URL (Optional)
               </label>
               {!hasSystem && (
                 <button 
                   type="button" 
                   onClick={fillDefaultProxy}
                   className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                 >
                   <Wand2 size={10} /> Auto-fill Default
                 </button>
               )}
             </div>
             <input 
               type="text" 
               value={hasSystem ? 'System Default' : proxyUrl}
               onChange={(e) => setProxyUrl(e.target.value)}
               placeholder="e.g. https://cors-anywhere.herokuapp.com/" 
               readOnly={hasSystem}
               className="w-full bg-dark border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder-slate-600"
             />
             {!hasSystem && (
               <p className="text-[10px] text-slate-500 mt-1">
                 Required if you see "Failed to fetch" errors. Browsers block direct Feishu API calls. 
               </p>
             )}
          </div>

          {/* Guide Section */}
          <div className="border border-slate-700 rounded-lg overflow-hidden mt-4">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <HelpCircle size={16} className="text-primary" />
                <span className="font-medium">Configuration Guide</span>
              </div>
              {showGuide ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {showGuide && (
              <div className="p-4 bg-slate-900/50 text-xs text-slate-400 space-y-3">
                <div>
                  <h4 className="font-bold text-white mb-1">1. Get Credentials</h4>
                  <ol className="list-decimal pl-4 space-y-1 marker:text-slate-600">
                    <li>Go to <a href="https://open.feishu.cn/app?lang=en" target="_blank" className="text-primary hover:underline">Feishu Developer Console</a>.</li>
                    <li>Create a custom app. Copy <strong>App ID</strong> & <strong>Secret</strong>.</li>
                    <li>Enable permissions: <code>docs:doc:edit</code> and <code>drive:drive:readonly</code>.</li>
                    <li>Create a version and release the app.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit"
            className="w-full bg-[#00D6B9] hover:bg-[#00bda3] text-dark font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <Save size={18} /> Save Configuration
          </button>
        </form>
      </div>
    </div>
  );
};

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 shrink-0">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
)

export default SettingsModal;