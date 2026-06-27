import React, { useState, useRef, useEffect } from 'react';
import { Send, X, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { askAlex, type AlexContext, type AlexResponse, type HistoryMessage } from '../services/alexService';
import { useStore } from '../store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsCalled?: string[];
  tokensUsed?: number;
}

interface AlexPanelProps {
  isOpen: boolean;
  onClose: () => void;
  prospectContext?: {
    id: string;
    name: string;
    type?: string;
  };
}

const AlexPanel: React.FC<AlexPanelProps> = ({ isOpen, onClose, prospectContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCollaborateur = useStore((s) => s.currentCollaborateur);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const context: AlexContext = {
        currentPage: prospectContext ? 'prospect_detail' : 'dashboard',
        currentProspectId: prospectContext?.id,
        currentProspectName: prospectContext?.name,
        currentProspectType: prospectContext?.type,
        courtierId: currentCollaborateur?.id,
        courtierName: currentCollaborateur?.nom,
      };

      const history: HistoryMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response: AlexResponse = await askAlex(msg, context, history);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.text,
          toolsCalled: response.toolsCalled,
          tokensUsed: response.tokensUsed,
        },
      ]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de connexion à Alex';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-[#1a1d21] border-l border-slate-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-[#15171a]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-sm text-white">Alex Assistant</span>
          <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">IA</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-700 transition-colors"
        >
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-8">
            <p className="font-medium text-slate-400 mb-2">Bonjour, je suis Alex.</p>
            <p>Posez-moi une question sur le portefeuille :</p>
            <div className="mt-3 space-y-1.5 text-xs">
              <button
                onClick={() => setInput('Quels contrats arrivent à échéance en septembre ?')}
                className="block w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                "Quels contrats arrivent à échéance en septembre ?"
              </button>
              <button
                onClick={() => setInput('Fiche complète de ')}
                className="block w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                "Fiche complète de [nom du client]"
              </button>
              <button
                onClick={() => setInput('Analyse la multidétention de ')}
                className="block w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                "Analyse la multidétention de [nom]"
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              ) : (
                <span>{msg.content}</span>
              )}

              {msg.role === 'assistant' && msg.toolsCalled && msg.toolsCalled.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500">Outils :</span>
                  {msg.toolsCalled.map((t, j) => (
                    <span
                      key={j}
                      className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                  {msg.tokensUsed && (
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {msg.tokensUsed} tokens
                    </span>
                  )}
                </div>
              )}

              {msg.role === 'assistant' && (
                <div className="mt-1.5 flex gap-1">
                  <button className="p-1 rounded hover:bg-slate-700 transition-colors" title="Utile">
                    <ThumbsUp size={12} className="text-slate-500 hover:text-emerald-400" />
                  </button>
                  <button className="p-1 rounded hover:bg-slate-700 transition-colors" title="Inutile">
                    <ThumbsDown size={12} className="text-slate-500 hover:text-rose-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 size={14} className="text-blue-400 animate-spin" />
              <span className="text-sm text-slate-400">Alex réfléchit...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-700 bg-[#15171a]">
        {prospectContext && (
          <div className="mb-2 text-[10px] text-slate-500 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Contexte : {prospectContext.name}
            {prospectContext.type && ` (${prospectContext.type})`}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question à Alex..."
            disabled={loading}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlexPanel;
