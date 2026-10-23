import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Receipt,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { chatService } from '../api/chatService';
import type { ChatMessage } from '../types';
import { useAuth, getInitials } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

export const AskShopLedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const resolvedOwnerName =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Store Owner');
  const userInitials = getInitials(resolvedOwnerName, 'SO');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadChat() {
      const msgs = await chatService.getMessages();
      setMessages(msgs);
    }
    loadChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    setInputText('');
    setIsTyping(true);

    try {
      await chatService.sendMessage(query);
      const updated = await chatService.getMessages();
      setMessages(updated);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error generating response',
        message: err.message || 'Unable to communicate with assistant',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetContext = () => {
    chatService.clearMessages();
    setMessages([]);
    showToast({
      type: 'info',
      title: 'Context Reset',
      message: 'Started a fresh conversation session.',
    });
  };

  const promptSuggestions = [
    'Which vendor gave me the lowest price for Fortune Mustard Oil 1L pouch in the last 60 days?',
    'How much did I spend with Shree Balaji Traders this month?',
    'Which items have pending low-confidence check warnings?',
    'Compare my edible oil prices across suppliers',
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header & Model Status (Stitch Accurate) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-outline/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-sm text-xl font-bold text-on-surface">Ask ShopLedger</h1>
              <span className="bg-primary-fixed text-on-primary-fixed text-label-xs font-semibold px-2 py-0.5 rounded-full">
                Gemini 2.5 Grounded
              </span>
            </div>
            <p className="text-label-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
              Connected strictly to your shop’s verified purchase bills
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetContext}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Context
          </Button>
        </div>
      </div>

      {/* Scope Security Pill */}
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline text-label-xs text-on-surface-variant">
        <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
        <span>
          <strong>Private Shop Scope:</strong> Answers are derived strictly from your authenticated store records and deterministic ledger arithmetic. Zero cross-tenant data leakage.
        </span>
      </div>

      {/* Chat Thread Container */}
      <div className="rounded-2xl bg-surface-container-lowest border border-outline shadow-card min-h-[500px] flex flex-col justify-between overflow-hidden">
        {/* Messages Stream */}
        <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-h-[620px]">
          {/* Safe Empty State for New Conversation */}
          {messages.length === 0 && (
            <div className="py-8 px-4 text-center max-w-2xl mx-auto space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mx-auto shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                  Namaste {resolvedOwnerName} ji 👋
                </h2>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  Ask anything about your store's purchase receipts, mandi commodity rates, supplier price changes, or how to use ShopLedger features.
                </p>
              </div>

              {/* Prompt Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
                {promptSuggestions.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline/50 text-body-sm text-on-surface text-xs font-medium text-left transition-all hover:border-primary/40 flex items-start gap-2 shadow-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Message History */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={cn('flex items-start gap-3', isUser ? 'justify-end' : 'justify-start')}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-2xl rounded-2xl p-4 shadow-sm text-body-sm space-y-3',
                    isUser
                      ? 'bg-secondary-container text-on-secondary-fixed rounded-tr-xs'
                      : 'bg-surface-container-low text-on-surface rounded-tl-xs border border-outline/30'
                  )}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Render Structured Comparison Card (Stitch Accurate) */}
                  {msg.structuredCard && (
                    <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline/40 shadow-sm space-y-2 mt-2">
                      <div className="flex items-center justify-between border-b border-outline/20 pb-1.5">
                        <span className="text-label-xs font-bold text-on-surface">
                          {msg.structuredCard.title || 'Procurement Record Benchmark'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed">
                          Verified Bahi Khata
                        </span>
                      </div>

                      {msg.structuredCard.type === 'supplier_comparison' && (
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="p-2.5 rounded-lg bg-surface-container-low border border-emerald-600/20">
                            <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">
                              Lowest Rate 🏆
                            </span>
                            <span className="font-semibold text-on-surface block mt-0.5">
                              {msg.structuredCard.data?.cheapest?.supplier}
                            </span>
                            <span className="font-mono font-bold text-primary text-sm">
                              {msg.structuredCard.data?.cheapest?.rate}
                            </span>
                            <span className="text-[10px] text-on-surface-variant block mt-0.5">
                              {msg.structuredCard.data?.cheapest?.date}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-surface-container-low border border-amber-600/20">
                            <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">
                              Higher Benchmark
                            </span>
                            <span className="font-semibold text-on-surface block mt-0.5">
                              {msg.structuredCard.data?.highest?.supplier}
                            </span>
                            <span className="font-mono font-bold text-on-surface text-sm">
                              {msg.structuredCard.data?.highest?.rate}
                            </span>
                            <span className="text-[10px] text-on-surface-variant block mt-0.5">
                              {msg.structuredCard.data?.highest?.date}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source Citations */}
                  {msg.citedReceiptIds && msg.citedReceiptIds.length > 0 && (
                    <div className="pt-2 border-t border-outline/20 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                        Supporting Invoices:
                      </span>
                      {msg.citedReceiptIds.map((recId) => (
                        <button
                          key={recId}
                          onClick={() => navigate(`/receipts/${recId}`)}
                          className="px-2 py-0.5 rounded-md bg-surface-container-lowest hover:bg-surface-container border border-outline/40 text-primary text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Receipt className="w-3 h-3 text-primary" />
                          <span>{recId}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-on-surface-variant text-right">
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center flex-shrink-0 font-label-xs text-xs font-bold mt-0.5">
                    {userInitials}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-xs bg-surface-container-low border border-outline/30 text-xs text-on-surface-variant flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                <span>Cross-checking shop procurement records & verifying rates…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-surface-container-low border-t border-outline/30 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask about your purchase bills, rates, or suppliers (e.g. Which vendor gave lowest price for sugar?)..."
            className="flex-1 bg-surface-container-lowest text-sm text-on-surface px-4 py-2.5 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-on-surface-variant"
          />
          <Button
            variant="primary"
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            leftIcon={<Send className="w-4 h-4" />}
            className="font-bold flex-shrink-0"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
