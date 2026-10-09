import React, { useState, useRef, useEffect } from 'react';
import { ScreenshotNode, ChatMessage } from '../types/aura';
import {
  Send,
  BrainCircuit,
  Mic,
  MicOff,
  Bot,
  User,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

interface Props {
  screenshots: ScreenshotNode[];
  focusedNodeId: string | null;
  onClearFocus: () => void;
  onHighlightNodeInGraph: (nodeId: string) => void;
}

export const CognitiveChat: React.FC<Props> = ({
  screenshots,
  focusedNodeId,
  onClearFocus,
  onHighlightNodeInGraph,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'model',
      content: `Olá. Posso consultar e correlacionar suas notas, áudios e capturas para responder com base factual verificável.

Exemplos de perguntas:
- "Quais foram os design tokens definidos no Figma?"
- "O que anotei sobre embeddings híbridos?"
- "O que disse no áudio sobre raios dos cards?"`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const focusedScreenshot = screenshots.find((s) => s.id === focusedNodeId);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          screenshots: screenshots.map((s) => ({
            id: s.id,
            filename: s.filename,
            sourceApp: s.sourceApp,
            visualContext: s.visualContext,
            ocrText: s.userEditedText || s.ocrText,
            tags: s.tags,
          })),
          enableThinking,
          useGoogleSearch: false,
          focusedNodeId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erro na API (${res.status})`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'model',
        content: data.reply || 'Sem resposta do cérebro cognitivo.',
        timestamp: new Date().toISOString(),
        groundingChunks: data.groundingChunks,
        isThinking: enableThinking,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          role: 'model',
          content: `Não foi possível processar a resposta: ${err.message || 'Erro de conexão'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            setIsTranscribing(true);
            try {
              const res = await fetch('/api/audio/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Audio, mimeType: 'audio/webm' }),
              });
              const data = await res.json();
              if (data.transcription) {
                setInputValue((prev) => (prev ? `${prev} ${data.transcription}` : data.transcription));
              }
            } catch (e) {
              console.error('Transcription error:', e);
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Microphone error:', err);
      }
    }
  };

  const renderMessageContent = (content: string) => {
    const citationRegex = /\[\[cite:([a-zA-Z0-9_\-]+)\|([^\]]+)\]\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      const nodeId = match[1];
      const title = match[2];

      parts.push(
        <button
          key={`cite_${matchIndex}`}
          onClick={() => onHighlightNodeInGraph(nodeId)}
          className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 mx-1 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-medium transition-colors"
          title={`Ver no grafo: ${title}`}
        >
          <ImageIcon className="w-3 h-3 text-cyan-400" />
          <span>{title}</span>
        </button>
      );

      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-sm text-slate-200 select-text font-normal">
        {parts}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#06090F] select-text">
      {/* Minimal Sub-header */}
      <div className="px-6 py-2.5 border-b border-white/[0.06] bg-[#070A12]/80 backdrop-blur-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span>Diálogo Cognitivo</span>
          <span>·</span>
          <span>{screenshots.length} itens indexados</span>
        </div>

        <button
          onClick={() => setEnableThinking(!enableThinking)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
            enableThinking
              ? 'bg-white/[0.1] text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>Raciocínio Profundo</span>
        </button>
      </div>

      {/* Focus Pill if focusing on specific node */}
      {focusedScreenshot && (
        <div className="px-6 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <span className="truncate">
            Foco ativo: <strong className="text-white">{focusedScreenshot.filename}</strong>
          </span>
          <button
            onClick={onClearFocus}
            className="text-slate-500 hover:text-white underline text-[11px]"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 max-w-3xl mx-auto w-full">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-white text-black'
                    : 'bg-white/[0.05] text-slate-400 border border-white/[0.08]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`rounded-2xl px-4 py-3 max-w-xl ${
                  isUser
                    ? 'bg-white/[0.08] text-white'
                    : 'bg-white/[0.02] border border-white/[0.06] text-slate-200'
                }`}
              >
                {renderMessageContent(msg.content)}
                <div className="text-[10px] text-slate-500 text-right mt-1 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-xs text-slate-400 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] max-w-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Consultando grafo e cruzando dados factuais...</span>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-white/[0.06] bg-[#070A12]/90 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-3xl mx-auto"
        >
          <button
            type="button"
            onClick={handleToggleRecord}
            disabled={isTranscribing}
            className={`p-2 rounded-lg transition-colors ${
              isRecording
                ? 'bg-rose-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Falar por voz"
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isRecording
                ? 'Ouvindo...'
                : 'Pergunte sobre seus pensamentos, conversas ou capturas...'
            }
            className="flex-1 bg-white/[0.03] border border-white/[0.06] focus:border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2 bg-white text-black hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
