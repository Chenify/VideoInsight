import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, AnalysisStatus, HistoryItem, Language, FeishuConfig } from './types';
import { analyzeVideo } from './services/geminiService';
import { syncToFeishu } from './services/feishuService';
import { SYSTEM_CONFIG, isSystemConfigured } from './config';
import VideoInput from './components/VideoInput';
import MindMapGraph, { MindMapGraphRef } from './components/MindMapGraph';
import SummaryCard from './components/SummaryCard';
import SettingsModal from './components/SettingsModal';
import { Sparkles, BrainCircuit, PlayCircle, RotateCcw, Clock, ArrowLeft, Trash2, Home, Share2, FileText, CheckCircle, X, Settings, AlertTriangle, Download, Zap, Image as ImageIcon, FileDown } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Ref for accessing MindMap export function
  const mindMapRef = useRef<MindMapGraphRef>(null);
  
  // Settings State (User Local Config)
  const [showSettings, setShowSettings] = useState(false);
  const [feishuConfig, setFeishuConfig] = useState<FeishuConfig>({ appId: '', appSecret: '', defaultFolderToken: '', proxyUrl: '' });

  // Feishu Modal State (Sync specific)
  const [showFeishuModal, setShowFeishuModal] = useState(false);
  const [folderToken, setFolderToken] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState('');

  // Check if system is pre-configured
  const hasSystemConfig = isSystemConfigured();

  // Load history and settings on mount
  useEffect(() => {
    // Load History
    const savedHistory = localStorage.getItem('video_insight_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history");
      }
    }

    // Load User Settings
    const savedConfig = localStorage.getItem('feishu_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setFeishuConfig(parsed);
        if (parsed.defaultFolderToken) {
          setFolderToken(parsed.defaultFolderToken);
        }
      } catch (e) {
        console.error("Failed to load settings");
      }
    } else if (hasSystemConfig) {
      // If no local config but system config exists, prepopulate folder token
      if (SYSTEM_CONFIG.defaultFolderToken) {
        setFolderToken(SYSTEM_CONFIG.defaultFolderToken);
      }
    }
  }, [hasSystemConfig]);

  const saveToHistory = (res: AnalysisResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      result: res
    };
    const updatedHistory = [newItem, ...history].slice(0, 10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem('video_insight_history', JSON.stringify(updatedHistory));
  };

  const handleSaveSettings = (config: FeishuConfig) => {
    setFeishuConfig(config);
    if (config.defaultFolderToken) {
      setFolderToken(config.defaultFolderToken);
    }
    localStorage.setItem('feishu_config', JSON.stringify(config));
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('video_insight_history', JSON.stringify(updated));
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.result);
    if (item.result.source?.type === 'url') {
      setVideoPreview(null); 
    } else {
      setVideoPreview(null);
    }
    setStatus(AnalysisStatus.COMPLETE);
  };

  const handleAnalysis = async (input: File | string, lang: Language) => {
    if (typeof input !== 'string') {
      setVideoPreview(URL.createObjectURL(input));
    } else {
      setVideoPreview(null);
    }
    
    setStatus(AnalysisStatus.ANALYZING);

    try {
      const analysisData = await analyzeVideo(input, lang);
      setResult(analysisData);
      saveToHistory(analysisData);
      setStatus(AnalysisStatus.COMPLETE);
    } catch (error) {
      console.error(error);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  // Determine active configuration (System > User)
  const getActiveConfig = (): FeishuConfig => {
    if (hasSystemConfig) {
      return {
        appId: SYSTEM_CONFIG.appId,
        appSecret: SYSTEM_CONFIG.appSecret,
        proxyUrl: SYSTEM_CONFIG.proxyUrl || feishuConfig.proxyUrl,
        defaultFolderToken: SYSTEM_CONFIG.defaultFolderToken || feishuConfig.defaultFolderToken
      };
    }
    return feishuConfig;
  };

  const handleSyncToFeishu = async () => {
    if (!result) return;
    
    const activeConfig = getActiveConfig();

    if (!activeConfig.appId || !activeConfig.appSecret) {
      setSyncError("Configuration required.");
      setSyncStatus('error');
      // If config is missing, force show modal to prompt user
      setShowFeishuModal(true);
      return;
    }

    setSyncStatus('syncing');
    setSyncError('');
    
    try {
      // Use active folder token or fallback to config default
      const tokenToUse = folderToken || activeConfig.defaultFolderToken || '';
      
      await syncToFeishu(result, tokenToUse, activeConfig);
      
      setSyncStatus('success');
      
      // If using system config, we might not have the modal open, so we show success state briefly then reset
      if (!showFeishuModal) {
         setShowFeishuModal(true); 
      }
      
      setTimeout(() => {
        if (showFeishuModal) setShowFeishuModal(false);
        setSyncStatus('idle');
      }, 2000);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message || "Sync failed");
      // Always show modal on error so user can see what happened
      setShowFeishuModal(true);
    }
  };

  // One-click sync button handler
  const handleSmartSyncClick = () => {
    setSyncStatus('idle');
    setSyncError('');
    
    if (hasSystemConfig && !syncError) {
      handleSyncToFeishu();
    } else {
      if (feishuConfig.defaultFolderToken && !folderToken) {
        setFolderToken(feishuConfig.defaultFolderToken);
      }
      setShowFeishuModal(true);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!result) return;
    const title = result.mindmap.name || "analysis";
    const content = `
# ${title}

## Key Takeaways
${result.keyPoints.map(p => `- ${p}`).join('\n')}

## Content Summary
${result.summary}

## Source
${result.source?.value}
    `.trim();

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_analysis.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = () => {
    if (result && mindMapRef.current) {
       const title = result.mindmap.name || "knowledge_graph";
       mindMapRef.current.downloadImage(title.replace(/\s+/g, '_'));
    }
  };

  const reset = () => {
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  };

  return (
    <div className="min-h-screen bg-dark text-slate-200 selection:bg-primary/30 font-sans relative">
      
      {/* Header */}
      <header className="bg-surface/50 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={reset} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg">
               <BrainCircuit className="text-white h-6 w-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">VideoInsight<span className="text-primary">AI</span></span>
          </button>
          
          <div className="flex items-center gap-4">
             {status !== AnalysisStatus.IDLE && (
               <button onClick={reset} className="text-sm text-slate-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
                 <Home size={16} /> Home
               </button>
             )}
             
             {/* Hide Settings if System Config is active to avoid confusion, or show it as readonly info */}
             <button 
               onClick={() => setShowSettings(true)}
               className="text-slate-400 hover:text-white p-2 hover:bg-slate-700/50 rounded-full transition-colors relative"
               title="Settings"
             >
               <Settings size={20} />
               {(!hasSystemConfig && !feishuConfig.appId) && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-800"></span>}
               {hasSystemConfig && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-slate-800"></span>}
             </button>

             <span className="text-xs text-slate-500 font-mono hidden sm:inline-block border-l border-slate-700 pl-4">Gemini 2.5 Flash</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
        
        {/* Intro / Input Section */}
        {status === AnalysisStatus.IDLE && (
          <div className="flex flex-col items-center justify-center py-8 space-y-12 fade-in">
            <div className="text-center max-w-2xl space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 pb-2">
                Turn Video into Knowledge
              </h1>
              <p className="text-lg text-slate-400">
                Upload a video or paste a URL. Our AI extracts key points and builds an interactive knowledge map instantly.
              </p>
            </div>
            
            <VideoInput 
              onVideoSelected={(file, lang) => handleAnalysis(file, lang)} 
              onUrlSelected={(url, lang) => handleAnalysis(url, lang)} 
              isLoading={false} 
            />

            {/* History Section - Same as before */}
            {history.length > 0 && (
              <div className="w-full max-w-4xl mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-700 pb-2">
                  <Clock size={18} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Recent Analysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => loadHistoryItem(item)}
                      className="group relative bg-surface border border-slate-700 rounded-xl p-4 hover:border-primary/50 hover:bg-slate-700/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.result.source?.type === 'url' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-purple-500/20 text-purple-300'}`}>
                          {item.result.source?.type === 'url' ? 'URL' : 'UPLOAD'}
                        </span>
                        <button 
                          onClick={(e) => deleteHistoryItem(e, item.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h4 className="text-slate-200 font-medium line-clamp-1 mb-1" title={item.result.mindmap.name}>
                        {item.result.mindmap.name}
                      </h4>
                      <p className="text-xs text-slate-500 mb-3">
                        {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      <div className="text-xs text-slate-400 line-clamp-2">
                         {item.result.keyPoints[0]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State - Same as before */}
        {(status === AnalysisStatus.UPLOADING || status === AnalysisStatus.ANALYZING) && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-pulse-slow">
             <div className="relative">
               <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
               <Sparkles className="w-16 h-16 text-primary relative z-10 animate-spin" style={{ animationDuration: '3s' }} />
             </div>
             <h2 className="text-2xl font-semibold text-white">
               {status === AnalysisStatus.UPLOADING ? 'Processing Video...' : 'Gemini is Thinking...'}
             </h2>
             <p className="text-slate-400 text-center max-w-md">
               Analyzing content, extracting insights, and synthesizing a knowledge structure.
             </p>
          </div>
        )}

        {/* Error State - Same as before */}
        {status === AnalysisStatus.ERROR && (
          <div className="text-center py-20">
            <div className="inline-block p-4 bg-red-500/10 rounded-full mb-4">
              <RotateCcw className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
            <p className="text-slate-400 mb-6">Something went wrong while processing. Please check your API key or input and try again.</p>
            <button onClick={reset} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* Results Dashboard */}
        {status === AnalysisStatus.COMPLETE && result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <button onClick={reset} className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
                <ArrowLeft size={20} /> <span className="text-sm font-medium">Back to Home</span>
              </button>
              
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="text-sm text-slate-500 hidden lg:block mr-2">
                  Source: <span className="text-slate-300 max-w-[150px] truncate inline-block align-bottom ml-1" title={result.source?.value}>{result.source?.value}</span>
                </div>
                
                <button
                  onClick={handleDownloadImage}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                  title="Export Knowledge Graph as Image"
                >
                  <ImageIcon size={16} /> <span className="hidden sm:inline">Export Image</span>
                </button>

                <button
                  onClick={handleDownloadMarkdown}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                  title="Export Analysis as Markdown"
                >
                  <FileDown size={16} /> <span className="hidden sm:inline">Export MD</span>
                </button>
                
                {/* Updated Sync Button Logic */}
                <button 
                  onClick={handleSmartSyncClick}
                  className={`
                    ${hasSystemConfig ? 'bg-gradient-to-r from-[#00D6B9] to-teal-500 hover:opacity-90' : 'bg-[#00D6B9] hover:bg-[#00bda3]'} 
                    text-dark font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-lg
                  `}
                >
                  {hasSystemConfig ? <Zap size={16} className="fill-current" /> : <Share2 size={16} />} 
                  {hasSystemConfig ? 'Sync to Feishu' : 'Sync to Feishu'}
                </button>
              </div>
            </div>

            {/* Top Bar: Controls & Video */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              
              {/* Video Player */}
              {videoPreview && (
                <div className="w-full md:w-1/3 space-y-2">
                   <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                     <PlayCircle size={16} /> Source Video
                   </h3>
                   <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video shadow-lg relative group">
                        <video controls className="w-full h-full object-contain" src={videoPreview} />
                   </div>
                </div>
              )}

              {/* Mind Map Area */}
              <div className={`w-full ${videoPreview ? 'md:w-2/3' : ''} space-y-2`}>
                 <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <BrainCircuit size={16} /> Knowledge Graph
                 </h3>
                 <MindMapGraph ref={mindMapRef} data={result.mindmap} />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-slate-700 pt-8">
               <SummaryCard result={result} />
            </div>

          </div>
        )}

      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onSave={handleSaveSettings}
        currentConfig={feishuConfig}
      />

      {/* Feishu Sync Modal */}
      {showFeishuModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowFeishuModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-lg bg-[#00D6B9] flex items-center justify-center text-dark">
                 <FileText size={24} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-white">Sync to Feishu Docs</h3>
                 <p className="text-xs text-slate-400">
                   {hasSystemConfig ? 'Using System Credentials' : 'Configure destination'}
                 </p>
               </div>
            </div>

            {syncStatus === 'success' ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white">Sync Successful!</h4>
                <p className="text-slate-400 text-sm mt-1">Document created in your Feishu folder.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Folder Token (Optional)</label>
                  <input 
                    type="text" 
                    value={folderToken}
                    onChange={(e) => setFolderToken(e.target.value)}
                    placeholder="e.g. fldcn..." 
                    className="w-full bg-dark border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Paste a Feishu folder token (from URL). Leave empty to save to root.
                  </p>
                </div>
                
                {syncStatus === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3 rounded-lg flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                       <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                       <span className="flex-1 break-words">{syncError}</span>
                    </div>
                    {syncError.includes("Configuration") && !hasSystemConfig && (
                      <button 
                        onClick={() => { setShowFeishuModal(false); setShowSettings(true); }}
                        className="text-xs font-semibold underline text-left mt-1 hover:text-red-100"
                      >
                        Go to Settings
                      </button>
                    )}
                    {syncError.includes("CORS") && (
                       <div className="mt-2 space-y-2">
                          {!hasSystemConfig && (
                             <button 
                                onClick={() => { setShowFeishuModal(false); setShowSettings(true); }}
                                className="block w-full text-center bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded text-xs transition-colors"
                             >
                                Configure Proxy
                             </button>
                          )}
                          <button 
                             onClick={handleDownloadMarkdown}
                             className="block w-full text-center bg-white/10 hover:bg-white/20 text-white py-1.5 rounded text-xs transition-colors flex items-center justify-center gap-1"
                          >
                             <Download size={12} /> Download Markdown Instead
                          </button>
                       </div>
                    )}
                  </div>
                )}

                {!hasSystemConfig && (
                   <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <h5 className="text-xs font-semibold text-slate-300 mb-1">Target Account</h5>
                    <div className="text-[11px] text-slate-400 font-mono">
                       {feishuConfig.appId ? `App ID: ${feishuConfig.appId}` : 'Not configured'}
                    </div>
                   </div>
                )}

                <button 
                  onClick={handleSyncToFeishu}
                  disabled={syncStatus === 'syncing'}
                  className="w-full bg-[#00D6B9] hover:bg-[#00bda3] disabled:opacity-50 disabled:cursor-not-allowed text-dark font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {syncStatus === 'syncing' ? (
                    <>
                      <Sparkles size={16} className="animate-spin" /> Syncing...
                    </>
                  ) : (
                    <>
                      {hasSystemConfig ? 'Sync Now (System)' : 'Sync Now'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;