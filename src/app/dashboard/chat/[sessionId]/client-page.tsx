// src/app/dashboard/chat/[sessionId]/client-page.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import SenderConfigModal from '@/components/SenderConfigModal';
import { AnalysisResult } from '@/types';
import type { AnalysisPreview } from '@/lib/analysis-preview';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'analysis';
  analysisResult?: AnalysisResult;
  analysisPreview?: AnalysisPreview;
  analysisResultId?: string;
  locked?: boolean;
  flagReferences?: {
    flagId: string;
    text: string;
    type: 'red' | 'green';
  }[];
}

function normalizeMessages(msgs: Message[]): Message[] {
  return msgs.map((m) => ({
    ...m,
    timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp as any),
  }));
}

// Pick a sidebar title from the conversation. Skips auto-generated markers like
// "📋 Pasted a conversation for analysis." and prefers the user's first real input.
function deriveSessionTitle(msgs: Message[]): string | null {
  const skipPrefixes = ['📋', '📱', '📸'];
  for (const m of msgs) {
    if (m.role !== 'user' || m.type !== 'text') continue;
    const content = m.content?.trim();
    if (!content) continue;
    if (skipPrefixes.some((p) => content.startsWith(p))) continue;
    return content.length > 50 ? content.slice(0, 47).trim() + '…' : content;
  }
  // Fallback: if only auto-generated user markers exist, use the first one
  // (so the sidebar still reflects "this session has an analysis").
  for (const m of msgs) {
    if (m.role !== 'user' || m.type !== 'text') continue;
    const content = m.content?.trim();
    if (content) return content.length > 50 ? content.slice(0, 47).trim() + '…' : content;
  }
  return null;
}

export default function DashboardClientPage({
    sessionId,
    initialMessages,
    isPremium = false,
}: {
    sessionId: string;
    initialMessages: Message[];
    isPremium?: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => normalizeMessages(initialMessages));
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [showSenderConfig, setShowSenderConfig] = useState(false);
  const [userPosition, setUserPosition] = useState<'left' | 'right'>('right');
  const supabase = createClient();
  const router = useRouter();
  const isInitialMount = useRef(true);
  const titleSetRef = useRef(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [supabase.auth]);

  // Background save of the chat history. Best-effort: failures here don't
  // affect the live chat experience, so we log details but don't toast.
  const saveChatHistory = useCallback(async (currentMessages: Message[]) => {
      if (!sessionId || !user || currentMessages.length === 0 || (currentMessages.length === 1 && currentMessages[0].id === '1')) return;

      try {
          const messagesToStore = currentMessages.map(msg => {
              const ts = msg.timestamp instanceof Date
                ? msg.timestamp
                : new Date(msg.timestamp as any);
              return {
                  ...msg,
                  timestamp: isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString(),
                  // Never persist the heavy/sensitive result or preview in chat
                  // history — only the id, so it can be re-fetched and re-gated.
                  analysisResult: undefined,
                  analysisPreview: undefined,
                  analysisResultId: msg.analysisResultId || msg.analysisResult?.id,
              };
          });

          const { error } = await supabase.from('chat_history').upsert({
              session_id: sessionId,
              user_id: user.id,
              messages: messagesToStore,
          }, { onConflict: 'session_id' });

          if (error) throw error;
      } catch (error: any) {
          console.warn(
            "Background chat history save failed:",
            error?.message || error,
            { code: error?.code, details: error?.details, hint: error?.hint }
          );
      }
  }, [sessionId, user, supabase]);

  // Debounced effect to save chat history whenever messages change
  useEffect(() => {
      // We don't want to save the initial messages on the first render,
      // as this could cause a race condition or unnecessary write.
      if (isInitialMount.current) {
          isInitialMount.current = false;
          return;
      }

      // Set a timer to save the chat history after 1.5 seconds of inactivity.
      const handler = setTimeout(() => {
          saveChatHistory(messages);
      }, 1500);

      // Cleanup function to cancel the timer if messages change again quickly.
      return () => clearTimeout(handler);
    }, [messages, sessionId, saveChatHistory]); // Rerun this effect if messages or sessionId change

  // When the session ID changes, reset messages to the new initial messages
  useEffect(() => {
    setMessages(normalizeMessages(initialMessages));
    titleSetRef.current = false;
    // AND, find the most recent analysis in the loaded history and set it as active.
    const lastAnalysisResult = [...initialMessages]
        .reverse()
        .find(msg => msg.type === 'analysis' && msg.analysisResult)?.analysisResult;

    if (lastAnalysisResult) {
        setActiveAnalysis(lastAnalysisResult);
        console.log("Active analysis context restored from history.");
    } else {
        setActiveAnalysis(null);
    }
  }, [initialMessages, sessionId]);

  // Auto-name the session in the sidebar based on the first real user message.
  // Only updates while the title is still the default ("New Chat"), so we don't
  // overwrite anything the user (or AI) renamed later.
  useEffect(() => {
    if (titleSetRef.current || !sessionId || !user) return;
    const candidate = deriveSessionTitle(messages);
    if (!candidate) return;

    titleSetRef.current = true;
    (async () => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({ title: candidate })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .eq('title', 'New Chat')
        .select('id')
        .maybeSingle();

      if (error) {
        console.warn('Failed to auto-rename chat session:', error.message);
        titleSetRef.current = false; // allow retry next time
        return;
      }
      if (data) {
        // Tell the sidebar to refresh.
        window.dispatchEvent(new CustomEvent('chat-session-renamed'));
      }
    })();
  }, [messages, sessionId, user, supabase]);

  // Analyses are now persisted and gated server-side. The response carries a
  // resultId plus either the full result (premium) or a verdict-only preview
  // (locked). The browser never has to write — or even receive — locked data.
  const handleApiResponse = async (data: any): Promise<void> => {
    const resultId: string | undefined = data?.resultId;
    if (!resultId) {
      toast.error('Could not save analysis. Please try again.');
      return;
    }

    const base = {
      id: `analysis-${Date.now()}`,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date(),
      type: 'analysis' as const,
      analysisResultId: resultId,
    };

    if (data.locked) {
      const p = data.preview;
      trackEvent(ANALYTICS_EVENTS.ANALYSIS_COMPLETED, {
        locked: true,
        verdict: p?.verdict?.level,
        red_count: p?.redCount,
        green_count: p?.greenCount,
        critical_count: p?.criticalCount,
      });
      setActiveAnalysis(null);
      setMessages(prev => [...prev, { ...base, analysisPreview: data.preview, locked: true }]);
      toast.success('Analysis ready — unlock to view the full breakdown.');
      return;
    }

    const fullResult: AnalysisResult = { ...data.result, id: resultId };
    trackEvent(ANALYTICS_EVENTS.ANALYSIS_COMPLETED, { locked: false });
    setActiveAnalysis(fullResult);
    setMessages(prev => [...prev, { ...base, analysisResult: fullResult, locked: false }]);
    toast.success('Analysis complete! View summary in chat.');
  };

  const handleTextSubmit = async (text: string): Promise<void> => {
    if (!user) {
        toast.error("You must be logged in.");
        return;
    }
    setIsProcessing(true);
    trackEvent(ANALYTICS_EVENTS.ANALYSIS_STARTED, { method: 'text' });
    try {
      const response = await fetch('/api/analyze/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userPosition, sessionId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get analysis.');

      await handleApiResponse(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleImageSubmit = async (files: File[]): Promise<void> => {
    if (!user) {
        toast.error("You must be logged in.");
        return;
    }
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    trackEvent(ANALYTICS_EVENTS.ANALYSIS_STARTED, { method: 'image', image_count: files.length });
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/ocr/openai', { method: 'POST', body: formData });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to process screenshot.');

      const data = await response.json();
      await handleApiResponse(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenAnalysis = (resultId: string, focusFlagId?: string): void => {
    if (!resultId) {
      toast.error('Analysis is not ready to open yet. Please wait a moment.');
      return;
    }
    const url = focusFlagId
      ? `/dashboard/analysis/${resultId}?focus=${encodeURIComponent(focusFlagId)}`
      : `/dashboard/analysis/${resultId}`;
    router.push(url);
  };

  return (
    <div className="p-0 sm:p-6 lg:p-8 h-full flex items-center justify-center bg-stone-100">
        <div className="w-full max-w-4xl h-full">
            <ChatInterface
              sessionId={sessionId}
              messages={messages} // Pass the state down
              setMessages={setMessages} // Pass the setter function down
              onAnalyzeScreenshot={handleImageSubmit}
              onAnalyzeText={handleTextSubmit}
              isProcessing={isProcessing}
              onOpenAnalysis={handleOpenAnalysis}
              activeAnalysis={activeAnalysis}
              setActiveAnalysis={setActiveAnalysis}
              isPremium={isPremium}
            />
        </div>
        
        {showSenderConfig && (
            <SenderConfigModal
                userPosition={userPosition}
                onPositionChange={setUserPosition}
                onClose={() => setShowSenderConfig(false)}
            />
        )}
    </div>
  );
}