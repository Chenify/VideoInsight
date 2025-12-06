import React from 'react';
import { AnalysisResult } from '../types';
import { BookOpen, List, FileText } from 'lucide-react';

interface SummaryCardProps {
  result: AnalysisResult;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ result }) => {
  // Simple markdown-ish parser for safety, or just display as pre-wrap
  // For better quality, we might use 'react-markdown', but prompt asks for no extra large libs if possible, 
  // keeping it simple with whitespace-pre-wrap and some basic formatting class
  
  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      {/* Key Points Column */}
      <div className="bg-surface rounded-xl border border-slate-700 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4 text-secondary">
          <List size={20} />
          <h3 className="text-lg font-semibold text-white">Key Takeaways</h3>
        </div>
        <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
          {result.keyPoints.map((point, idx) => (
            <div key={idx} className="flex gap-3 items-start bg-slate-700/30 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
              <span className="bg-secondary/20 text-secondary text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">
                {idx + 1}
              </span>
              <p className="text-slate-300 text-sm leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Column */}
      <div className="bg-surface rounded-xl border border-slate-700 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <FileText size={20} />
          <h3 className="text-lg font-semibold text-white">Content Summary</h3>
        </div>
        <div className="prose prose-invert prose-sm max-w-none overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
           {/* Rendering Markdown content safely */}
           <div className="whitespace-pre-wrap text-slate-300 leading-relaxed font-light">
             {result.summary.split('\n').map((line, i) => {
                 if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mb-2 mt-4">{line.replace('# ', '')}</h1>
                 if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-slate-100 mb-2 mt-3">{line.replace('## ', '')}</h2>
                 if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-slate-300 mb-1">{line.replace('- ', '')}</li>
                 return <p key={i} className="mb-2">{line}</p>
             })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;