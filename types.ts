export type Language = 'en' | 'zh';

export interface MindMapNode {
  name: string;
  children?: MindMapNode[];
  value?: number;
}

export interface AnalysisResult {
  summary: string;
  mindmap: MindMapNode;
  keyPoints: string[];
  source?: {
    type: 'file' | 'url';
    value: string; // filename or url
  };
  language: Language;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  result: AnalysisResult;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface VideoFile {
  file: File | null;
  url: string | null;
  previewUrl: string | null;
}

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  defaultFolderToken?: string;
  proxyUrl?: string;
}