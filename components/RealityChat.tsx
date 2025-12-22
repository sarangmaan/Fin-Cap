import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Skull } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface RealityChatProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    symbol: string;
    riskScore: number;
    sentiment: string;
  };
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

const RealityChat: React.FC<RealityChatProps> = ({ isOpen, onClose, context }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Initial Message when opening
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      let initialMsg = "";
      if (context.riskScore > 60) {
        initialMsg = `I see you're looking at ${context.symbol}. Risk score is ${context.riskScore}. Do you hate money? 🤡`;
      } else if (context.riskScore < 40) {
        initialMsg = `${context.symbol}? Actually... not a terrible choice. Risk is only ${context.riskScore}. I'm shocked. 📈`;
      } else {
        initialMsg = `${context.symbol}. It's mid. Risk is ${context.riskScore}. Impress me.`;
      }
      
      setMessages([{ id: 'init', text: initialMsg, sender: 'ai' }]);
      hasInitialized.current = true;
    }
  }, [isOpen, context]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const currentInput = input;
    const userMsg: Message = { id: Date.now().toString(), text: currentInput, sender: 'user' };
    
    // Update UI immediately
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const isHighRisk = context.riskScore >= 60;
      const isSafe = context.riskScore <= 40;

      // Construct System Prompt
      const systemInstruction = `
        You are 'The Reality Check', a witty, sarcastic, but intelligent financial assistant.
        
        CONTEXT:
        - Asset: ${context.symbol}
        - Risk Score: ${context.riskScore}/100
        - Sentiment: ${context.sentiment}
        
        PERSONALITY RULES:
        1. **High Risk (>60)**: 
           - ATTITUDE: Ruthless, mocking, warning.
           - RESPONSE: Roast the user for choosing this. Examples: "Do you hate money?", "This is a dumpster fire."
        
        2. **Low Risk (<40)**: 
           - ATTITUDE: Impressed, validating, slightly surprised.
           - RESPONSE: Praise the user. Examples: "Finally, a smart move.", "I can't believe it, you actually picked a winner.", "Solid choice, try not to ruin it."
           - DO NOT ROAST LOW RISK ASSETS. Be supportive.
        
        3. **Mid Risk (40-60)**: 
           - ATTITUDE: Skeptical, bored.
           - RESPONSE: "It's mid.", "Flip a coin."
        
        INTERACTION LOGIC:
        - **IF User asks a direct question** ("Is this good?", "Should I buy?", "What do you think?"):
          - YOU MUST start with a clear verdict based on risk: "VERDICT: [YES/NO/RISKY]."
          - Then add the personality commentary.
          
        - **IF User says "I bought"**:
          - High Risk: "My condolences to your wallet. 💸"
          - Low Risk: "Look at you, making profits. 👑"

        - **GENERAL**:
          - Keep it short (under 3 sentences).
          - Use emojis.
      `;

      // Build History for Gemini
      // We map our messages state to the API format
      let history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      // Hack: Gemini chat history should ideally start with 'user'. 
      if (history.length > 0 && history[0].role === 'model') {
         history = [
           { role: 'user', parts: [{ text: `Give me a reality check on ${context.symbol}.` }] },
           ...history
         ];
      }

      // Add the new message
      const contents = [
         ...history,
         { role: 'user', parts: [{ text: currentInput }] }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 1.0, 
          maxOutputTokens: 500
        }
      });

      const replyText = response.text || "I'm ignoring you. (No response)";

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        text: replyText, 
        sender: 'ai' 
      }]);

    } catch (err: any) {
      console.error("RealityChat Error:", err);
      let errorText = "I'm ignoring you right now. 💀 (AI Error)";
      
      if (err.message?.includes('API key')) {
         errorText = "I can't see your API Key. Check your environment variables. 🔑";
      }

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        text: errorText, 
        sender: 'ai' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 md:w-96 h-[500px] bg-slate-900 border border-violet-500/50 rounded-2xl shadow-2xl z-[60] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in">
      
      {/* Header */}
      <div className="bg-violet-900/20 p-4 border-b border-violet-500/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-600 rounded-lg">
             <Skull className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">The Reality Check</h3>
            <span className="text-[10px] text-violet-300 font-mono uppercase">Brutally Honest AI</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-slate-800 text-slate-200 rounded-br-none' 
                : 'bg-violet-600 text-white rounded-bl-none shadow-[0_0_10px_rgba(124,58,237,0.3)]'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1 shadow-[0_0_10px_rgba(124,58,237,0.1)]">
               <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></span>
               <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-75"></span>
               <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={loading ? "Analyzing..." : "Ask me anything..."}
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-500"
          autoFocus
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default RealityChat;