//src\components\ChatInterface.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  PhotoIcon,
  UserIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Check,
  Phone,
  ScanLine,
  Lock,
  X,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { detectWhatsAppFormat } from '@/lib/parsers/whatsapp-parser';
import { AnalysisResult } from '@/types';
import { getVerdict, type VerdictMeta } from '@/lib/flag-labels';
import type { AnalysisPreview } from '@/lib/analysis-preview';
import { maxImagesFor, PREMIUM_MAX_IMAGES, FREE_MAX_IMAGES } from '@/lib/limits';
import AssistantMessage from './AssistantMessage';

const ScanningAnalysisLoader = () => {
  const [loadingText, setLoadingText] = useState('Reading the conversation…');

  useEffect(() => {
    const steps = [
      "Reading the conversation…",
      "Spotting patterns and tone…",
      "Checking for manipulation signals…",
      "Looking for green flags too…",
      "Writing your verdict…",
    ];

    let index = 0;
    setLoadingText(steps[0]);

    const interval = setInterval(() => {
      index = (index + 1) % steps.length;
      setLoadingText(steps[index]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center p-6 bg-white ring-1 ring-stone-200 rounded-2xl shadow-sm max-w-sm mx-auto my-4"
    >
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 rounded-xl">
          <ScanLine className="w-8 h-8 text-indigo-400" />
        </div>
        <motion.div
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          style={{ width: '100%' }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 ring-2 ring-indigo-400 rounded-xl"
        />
      </div>

      <div className="flex flex-col items-center space-y-1.5">
        <h4 className="font-semibold text-slate-900 text-sm">Analyzing your chat</h4>
        <motion.p
          key={loadingText}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-indigo-600 font-medium"
        >
          {loadingText}
        </motion.p>
      </div>

      <div className="w-full bg-stone-100 h-1 mt-4 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-indigo-500"
          animate={{ width: ['0%', '100%'] }}
          transition={{ duration: 15, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
};

const SenderSelectionModal = ({ senders, onSelect, onClose }: { senders: string[], onSelect: (sender: string) => void, onClose: () => void }) => (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full ring-1 ring-stone-200"
        >
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-1.5">Who are you in this chat?</h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">Pick your name so we know whose side of the conversation to read.</p>
            <div className="space-y-2.5">
                {senders.map(sender => (
                    <button
                        key={sender}
                        onClick={() => onSelect(sender)}
                        className="w-full text-left px-4 py-3 bg-stone-50 hover:bg-indigo-50 ring-1 ring-stone-200 hover:ring-indigo-300 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <span className="font-medium text-slate-800">{sender}</span>
                    </button>
                ))}
            </div>
            <button
                onClick={onClose}
                className="w-full mt-5 text-center py-2 text-sm font-medium text-slate-500 hover:text-slate-700 rounded-full transition-colors"
            >
                Cancel
            </button>
        </motion.div>
    </div>
);

// --- Type Definitions and Helper Functions ---
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'analysis';
  analysisResult?: AnalysisResult;
  analysisPreview?: AnalysisPreview;
  analysisResultId?: string;
  locked?: boolean;
  flagReferences?: FlagReference[];
}

interface SummaryCardModel {
  verdict: VerdictMeta;
  redCount: number;
  greenCount: number;
  criticalCount: number;
  locked: boolean;
}

// Normalize a finished-analysis message into just what the summary card needs.
// Premium messages carry the full result; locked ones carry only a preview.
function toCardModel(message: Message): SummaryCardModel | null {
  if (message.analysisResult) {
    const flags = message.analysisResult.flags || [];
    return {
      verdict: getVerdict(message.analysisResult),
      redCount: flags.filter((f) => f.type === 'red').length,
      greenCount: flags.filter((f) => f.type === 'green').length,
      criticalCount: flags.filter(
        (f) => f.severity === 'critical' || f.safetyLevel === 'immediate_danger'
      ).length,
      locked: false,
    };
  }
  if (message.analysisPreview) {
    const p = message.analysisPreview;
    return {
      verdict: p.verdict,
      redCount: p.redCount,
      greenCount: p.greenCount,
      criticalCount: p.criticalCount,
      locked: true,
    };
  }
  return null;
}

interface FlagReference {
  flagId: string;
  text: string;
  type: 'red' | 'green';
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const SUMMARY_VERDICT_ICON: Record<VerdictMeta['level'], LucideIcon> = {
  safe: ShieldCheck,
  caution: AlertCircle,
  concerning: ShieldAlert,
  danger: AlertTriangle,
};

const SUMMARY_VERDICT_GRADIENT: Record<VerdictMeta['level'], string> = {
  safe: 'from-emerald-100 via-emerald-50 to-white',
  caution: 'from-amber-100 via-amber-50 to-white',
  concerning: 'from-rose-100 via-rose-50 to-white',
  danger: 'from-red-200 via-red-100 to-rose-50',
};

const SUMMARY_ICON_TINT: Record<VerdictMeta['level'], string> = {
  safe: 'bg-emerald-500 shadow-emerald-500/30',
  caution: 'bg-amber-500 shadow-amber-500/30',
  concerning: 'bg-rose-500 shadow-rose-500/30',
  danger: 'bg-red-600 shadow-red-600/40',
};

function AnalysisSummaryCard({ model, onViewFull }: { model: SummaryCardModel; onViewFull: () => void }) {
  const { verdict, redCount, greenCount, criticalCount, locked } = model;
  const VerdictIcon = SUMMARY_VERDICT_ICON[verdict.level];

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${SUMMARY_VERDICT_GRADIENT[verdict.level]} ring-1 ${verdict.tone.ring} p-4 sm:p-5 shadow-sm relative overflow-hidden`}>
      <div
        aria-hidden
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/40 blur-2xl pointer-events-none"
      />

      <div className="relative flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md ${SUMMARY_ICON_TINT[verdict.level]}`}>
          <VerdictIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${verdict.tone.accent}`}>
            {locked ? 'Analysis ready' : 'Analysis complete'}
          </p>
          <h3 className={`mt-0.5 text-lg font-semibold tracking-tight ${verdict.tone.text}`}>
            {verdict.title}
          </h3>
          <p className={`mt-1 text-sm leading-relaxed ${verdict.tone.text} opacity-85`}>
            {locked ? 'Unlock to see the full breakdown — every flag, what it means, and what to do.' : verdict.oneLine}
          </p>

          {(redCount > 0 || greenCount > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {redCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 ring-1 ring-rose-200 text-rose-700 px-2 py-0.5 text-[11px] font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  {redCount} red flag{redCount === 1 ? '' : 's'}
                </span>
              )}
              {greenCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 ring-1 ring-emerald-200 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold">
                  <Check className="w-3 h-3" />
                  {greenCount} green flag{greenCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {criticalCount > 0 && (
        <div className="relative mt-4 rounded-xl bg-red-50 ring-1 ring-red-200 px-3 py-2 text-xs text-red-900 flex items-start gap-2">
          <Phone className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">
              {criticalCount} critical alert{criticalCount === 1 ? '' : 's'}
            </span>{' '}
            <span className="opacity-80">
              {locked ? '— unlock the full analysis to view.' : '— please open the full analysis.'}
            </span>
          </span>
        </div>
      )}

      <button
        onClick={onViewFull}
        className="relative mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
      >
        {locked ? (
          <>
            <Lock className="w-4 h-4" />
            Unlock full results
          </>
        ) : (
          <>
            Open full analysis
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="relative mt-3 text-[11px] text-slate-500 text-center">
        {locked
          ? 'Go premium to read the full breakdown.'
          : 'Ask about any flag below — I’ll link to it directly.'}
      </p>
    </div>
  );
}

interface ChatInterfaceProps {
  sessionId: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onAnalyzeScreenshot: (files: File[]) => Promise<void>;
  onAnalyzeText: (text: string) => Promise<void>;
  isProcessing: boolean;
  onOpenAnalysis: (resultId: string, focusFlagId?: string) => void;
  activeAnalysis: AnalysisResult | null;
  setActiveAnalysis: React.Dispatch<React.SetStateAction<AnalysisResult | null>>;
  isPremium?: boolean;
}

export default function ChatInterface({
  sessionId,
  messages,
  setMessages,
  onAnalyzeScreenshot,
  onAnalyzeText,
  isProcessing,
  onOpenAnalysis,
  activeAnalysis,
  setActiveAnalysis,
  isPremium = false
}: ChatInterfaceProps) {
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSenderModal, setShowSenderModal] = useState(false);
  const [detectedSenders, setDetectedSenders] = useState<string[]>([]);
  const [pendingText, setPendingText] = useState('');
  // Staged screenshots: attach several before analyzing, like other chat apps.
  const [pendingImages, setPendingImages] = useState<{ file: File; url: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const maxImages = maxImagesFor(isPremium);

  // Revoke object URLs when the component unmounts (avoid memory leaks).
  const pendingRef = useRef(pendingImages);
  pendingRef.current = pendingImages;
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]); // Scroll when messages OR processing state changes

  // Add screenshots to the staging tray, respecting the per-plan cap.
  const addImages = (files: File[]) => {
    if (files.length === 0) return;
    const remaining = maxImages - pendingImages.length;
    if (remaining <= 0) {
      toast.error(
        isPremium
          ? `You can attach up to ${PREMIUM_MAX_IMAGES} screenshots.`
          : `Free accounts can attach up to ${FREE_MAX_IMAGES} screenshots. Upgrade to Premium for more.`
      );
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more screenshot${remaining === 1 ? '' : 's'} (max ${maxImages}).`);
    }
    setPendingImages((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  };

  const removeImage = (idx: number) => {
    setPendingImages((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const analyzePending = () => {
    if (pendingImages.length === 0 || isProcessing) return;
    const files = pendingImages.map((p) => p.file);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'user',
        content:
          files.length > 1
            ? `📸 Analyzing ${files.length} screenshots…`
            : '📸 Analyzing screenshot…',
        timestamp: new Date(),
        type: 'text',
      },
    ]);
    onAnalyzeScreenshot(files);
    pendingImages.forEach((p) => URL.revokeObjectURL(p.url));
    setPendingImages([]);
  };

  const handleFlagClick = (flagId: string) => {
    if (activeAnalysis?.id) {
      onOpenAnalysis(activeAnalysis.id, flagId);
    }
  };

  const handleWhatsAppAnalysis = async (text: string) => {
    await onAnalyzeText(text);
  };
  
  const handleTextSubmit = async (text: string) => {
    if (!text || text.trim().length < 20) {
      toast.error('Please provide a longer conversation for meaningful analysis.');
      return;
    }
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user',
      content: '📋 Analyzing conversation...',
      timestamp: new Date(), type: 'text'
    }]);

    if (detectWhatsAppFormat(text)) {
      await handleWhatsAppAnalysis(text);
    } else {
      await onAnalyzeText(text);
    }
  };

  const handleSenderSelection = async (selectedSender: string) => {
    setShowSenderModal(false);
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'assistant',
      content: `Got it! I'll analyze the conversation with you as "${selectedSender}" and examine the other person's behavior.`,
      timestamp: new Date(), type: 'text'
    }]);
    await handleWhatsAppAnalysis(pendingText);
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing || isTyping) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date(), type: 'text' };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      // Send the recent text turns + the new message. The server reconstructs
      // analysis context (and voice/personalization) from sessionId.
      const recentTurns = messages
        .filter((m) => m.type === 'text')
        .slice(-30)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: [...recentTurns, { role: 'user', content: currentInput }],
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get response from AI assistant.');

      const data = await response.json();

      // Keep [[FLAG_ID::TEXT::TYPE]] markers in the content as-is; AssistantMessage
      // converts them into clickable chips during rendering.
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || '',
        timestamp: new Date(),
        type: 'text',
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    addImages(files);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          addImages([file]);
          return;
        }
      }
    }

    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('\n') && pastedText.length > 100) {
      e.preventDefault();
      
      if (detectWhatsAppFormat(pastedText)) {
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), role: 'user', 
          content: `📱 Pasted a WhatsApp conversation for analysis.`, 
          timestamp: new Date(), type: 'text'
        }]);
        await handleWhatsAppAnalysis(pastedText);
      } else {
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), role: 'user', 
          content: `📋 Pasted a conversation for analysis.`, 
          timestamp: new Date(), type: 'text'
        }]);
        await handleTextSubmit(pastedText);
      }
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white md:rounded-3xl md:shadow-xl md:shadow-slate-900/5 md:ring-1 md:ring-stone-200 overflow-hidden">
        <div className="bg-white border-b border-stone-200/70 px-4 sm:px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/25 flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight text-slate-900">Swipe Safe AI</h3>
                <p className="text-xs text-slate-500 truncate">
                  {activeAnalysis ? 'Analysis loaded — ask me anything' : 'Dating safety analysis'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {activeAnalysis && (
                <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2.5 py-1 rounded-full">
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  <span>Analysis active</span>
                </div>
              )}
              {isProcessing && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-2.5 py-1 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                  </span>
                  <span>Working</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 bg-stone-50/40">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'analysis' && toCardModel(message) ? (
                  <div className="w-full max-w-lg">
                    <AnalysisSummaryCard
                      model={toCardModel(message)!}
                      onViewFull={() =>
                        message.analysisResultId && onOpenAnalysis(message.analysisResultId)
                      }
                    />
                  </div>
                ) : (
                  <div className={`flex items-start gap-2.5 max-w-[88%] ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}>
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/20">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-500/20">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-md'
                        : 'bg-white ring-1 ring-stone-200 text-slate-800 rounded-tl-md'
                    }`}>
                      {message.role === 'assistant' ? (
                        <AssistantMessage
                          content={message.content}
                          onFlagClick={handleFlagClick}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      )}
                      <p
                        suppressHydrationWarning
                        className={`text-[11px] mt-1.5 ${
                        message.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isProcessing && <ScanningAnalysisLoader />}

          {isTyping && !isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white ring-1 ring-stone-200 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-stone-200/70 p-4 bg-white">
          <div className="mb-2.5 text-xs text-slate-500 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="text-amber-500">💡</span>
              <span className="truncate">
                {activeAnalysis ? 'Tap a flag name to view details' : 'Paste a conversation or upload a screenshot'}
              </span>
            </span>
            {activeAnalysis && (
              <button
                onClick={() => {
                  setActiveAnalysis(null);
                  toast.success('Analysis context cleared');
                }}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex-shrink-0"
              >
                Clear context
              </button>
            )}
          </div>
          {pendingImages.length > 0 && (
            <div className="mb-2.5 rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-2.5">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {pendingImages.map((img, i) => (
                  <div key={img.url} className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Screenshot ${i + 1}`}
                      className="w-16 h-16 rounded-lg object-cover ring-1 ring-stone-200"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      disabled={isProcessing}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow disabled:opacity-50"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {pendingImages.length < maxImages && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex-shrink-0 w-16 h-16 rounded-lg ring-1 ring-dashed ring-stone-300 text-slate-400 hover:text-indigo-600 hover:ring-indigo-300 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Add another screenshot"
                  >
                    <PhotoIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {pendingImages.length}/{maxImages} screenshots{!isPremium ? ' · free limit' : ''}
                </span>
                <button
                  onClick={analyzePending}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 text-white text-sm font-semibold px-4 py-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <ScanLine className="w-4 h-4" />
                  Analyze {pendingImages.length} screenshot{pendingImages.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-end gap-2 bg-stone-50 ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-0 rounded-2xl px-2 py-1.5 transition-shadow">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors disabled:opacity-40 flex-shrink-0"
              title={isPremium ? 'Upload screenshots' : `Upload up to ${FREE_MAX_IMAGES} screenshots`}
            >
              <PhotoIcon className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onPaste={handlePaste}
              placeholder={activeAnalysis ? 'Ask about the analysis…' : 'Ask a question, paste a conversation…'}
              className="flex-1 bg-transparent px-1 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-32"
              disabled={isTyping || isProcessing}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping || isProcessing}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm shadow-indigo-600/20"
              title="Send"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSenderModal && (
          <SenderSelectionModal
            senders={detectedSenders}
            onSelect={handleSenderSelection}
            onClose={() => {
              setShowSenderModal(false);
              setPendingText('');
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}