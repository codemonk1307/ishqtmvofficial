import React, { useState } from 'react';
import { Sparkles, Send, RefreshCw, Feather, BookOpen, Globe2, HelpCircle } from 'lucide-react';
import Markdown from 'react-markdown';

export default function NuktaCompanion() {
  const [inputText, setInputText] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'tashreeh' | 'translate' | 'complete' | 'chat'>('tashreeh');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'nukta'; text: string }>>([
    { 
      sender: 'nukta', 
      text: "Aadaab. I am Nukta (نقطہ), your AI Literary Companion. Whether you seek the deeper meaning (Tashreeh) of Ghalib, " +
            "require translations of Wordsworth, or need assistance crafting your own couplets under proper meters (Behr) and rhymes, I am here at your side.\n\n" +
            "How shall we delve into the world of adab and sahitya today?"
    }
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState<string>('');

  // Submit action on pasted text
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    const textToSend = inputText.trim();
    
    // Add User message
    const modeLabel = selectedAction === 'tashreeh' ? 'Tashreeh' : selectedAction === 'translate' ? 'Translate' : 'Poetic Continuation';
    setChatHistory(prev => [
      ...prev,
      { sender: 'user', text: `[${modeLabel} Request for]:\n"${textToSend}"` }
    ]);

    try {
      const response = await fetch('/api/literature-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          text: textToSend,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Server error (Status ${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error || errorMsg;
        } catch (e) {
          if (errorText) errorMsg = errorText.length > 150 ? `${errorText.slice(0, 150)}...` : errorText;
        }
        setChatHistory(prev => [
          ...prev,
          { sender: 'nukta', text: `Failed to fetch response: ${errorMsg}` }
        ]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setChatHistory(prev => [
          ...prev,
          { sender: 'nukta', text: data.answer }
        ]);
        setInputText(''); // Clear input
      } else {
        setChatHistory(prev => [
          ...prev,
          { sender: 'nukta', text: `An error occurred: ${data.error || 'Nukta went quiet. Please try again.'}` }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        { sender: 'nukta', text: `Error connecting to Nukta: ${err.message || 'Please make sure the server is online and the Gemini API key is configured.'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Submit direct chat question
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() && !inputText.trim()) return;

    setLoading(true);
    const question = customQuestion.trim();
    const referencedPoem = inputText.trim();

    setChatHistory(prev => [
      ...prev,
      { sender: 'user', text: question + (referencedPoem ? `\n\n(Referenced Poetry: "${referencedPoem}")` : '') }
    ]);
    setCustomQuestion('');

    try {
      const response = await fetch('/api/literature-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          text: referencedPoem || '',
          userPrompt: question
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Server error (Status ${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error || errorMsg;
        } catch (e) {
          if (errorText) errorMsg = errorText.length > 150 ? `${errorText.slice(0, 150)}...` : errorText;
        }
        setChatHistory(prev => [
          ...prev,
          { sender: 'nukta', text: `Failed to fetch response: ${errorMsg}` }
        ]);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setChatHistory(prev => [
          ...prev,
          { sender: 'nukta', text: data.answer }
        ]);
      } else {
        setChatHistory(prev => [
          ...prev,
          { sender: 'nukta', text: `I apologize, but I could not fulfill your query: ${data.error || 'Please retry.'}` }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        { sender: 'nukta', text: `Connection lost: ${err.message || 'Please ensure the backend is running and the Gemini API key is active.'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setChatHistory([
      { 
        sender: 'nukta', 
        text: "The slate is wiped clean. Let us begin another literary discourse. What is on your mind?" 
      }
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 bg-stone-50 border border-stone-200 rounded-2xl p-4 md:p-6 shadow-md animate-fade-in">
      {/* LEFT COLUMN: Input and Mode Selection */}
      <div className="md:col-span-5 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Feather className="w-5 h-5 text-[#bf9b30]" />
            <h3 className="font-serif text-lg font-medium text-stone-800">Literary Inkwell</h3>
          </div>
          <p className="text-xs text-stone-500 font-sans leading-relaxed mb-4">
            Paste any couplet (sher), verse, or text to evaluate, or select a mode to ask Nukta's analysis:
          </p>

          <form onSubmit={handleActionSubmit} className="space-y-4">
            <textarea
              id="txt-inkwell-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g., Dil-e-naadaan tujhe hua kya hai...\nOr write your own original line here..."
              rows={5}
              className="w-full bg-white border border-stone-300 rounded-xl p-3 text-sm font-serif text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#bf9b30] focus:border-[#bf9b30] resize-none shadow-inner"
            />

            {/* Mode selection button grid */}
            <div className="grid grid-cols-3 gap-2">
              <button
                id="mode-tashreeh"
                type="button"
                onClick={() => setSelectedAction('tashreeh')}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                  selectedAction === 'tashreeh'
                    ? 'bg-[#bf9b30]/10 border-[#bf9b30] text-[#a28021]'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-[10px] font-serif font-medium">Tashreeh</span>
              </button>

              <button
                id="mode-translate"
                type="button"
                onClick={() => setSelectedAction('translate')}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                  selectedAction === 'translate'
                    ? 'bg-[#bf9b30]/10 border-[#bf9b30] text-[#a28021]'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Globe2 className="w-4 h-4" />
                <span className="text-[10px] font-serif font-medium">Translate</span>
              </button>

              <button
                id="mode-complete"
                type="button"
                onClick={() => setSelectedAction('complete')}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                  selectedAction === 'complete'
                    ? 'bg-[#bf9b30]/10 border-[#bf9b30] text-[#a28021]'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Feather className="w-4 h-4" />
                <span className="text-[10px] font-serif font-medium">Complete</span>
              </button>
            </div>

            <button
              id="btn-trigger-action"
              type="submit"
              disabled={!inputText.trim() || loading}
              className={`w-full py-2.5 rounded-xl text-sm font-serif font-medium transition-all flex items-center justify-center gap-2 ${
                inputText.trim() && !loading
                  ? 'bg-stone-800 hover:bg-stone-900 text-white shadow-md'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Analyse via {selectedAction === 'tashreeh' ? 'Tashreeh' : selectedAction === 'translate' ? 'Translation' : 'Rhyme/Meter'}</span>
            </button>
          </form>
        </div>

        {/* Clear History */}
        <div className="border-t border-stone-200 pt-3">
          <button
            id="btn-clear-chat"
            onClick={clearChat}
            className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-xs font-serif transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clear Discourse Logs</span>
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Scrolling Dialogue Feed */}
      <div className="md:col-span-7 flex flex-col justify-between border-t md:border-t-0 md:border-l border-stone-200 pt-6 md:pt-0 md:pl-6 h-[500px]">
        {/* Dialogue history stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
          {chatHistory.map((chat, idx) => (
            <div
              key={idx}
              className={`flex flex-col max-w-[85%] ${
                chat.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              } animate-fade-in`}
            >
              <span className="text-[9px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                {chat.sender === 'user' ? 'You' : 'Nukta'}
              </span>
              <div
                className={`rounded-2xl px-4 py-3 text-sm font-serif leading-relaxed shadow-sm ${
                  chat.sender === 'user'
                    ? 'bg-stone-800 text-stone-100 rounded-tr-none whitespace-pre-wrap'
                    : 'bg-[#F2EDE4] text-stone-800 rounded-tl-none border border-stone-200/50 markdown-body'
                }`}
              >
                {chat.sender === 'user' ? (
                  chat.text
                ) : (
                  <Markdown>{chat.text}</Markdown>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start max-w-[85%] animate-pulse">
              <span className="text-[9px] font-mono uppercase text-stone-400 mb-1">Nukta is contemplating</span>
              <div className="bg-[#F2EDE4]/50 border border-stone-200 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Freeform conversational chat footer */}
        <form onSubmit={handleChatSubmit} className="border-t border-stone-200 pt-3 flex gap-2">
          <input
            id="input-conversational-query"
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Ask Nukta about poetry, Ghalib, Jaun, or meter..."
            className="flex-1 bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-sm font-serif text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#bf9b30] focus:border-[#bf9b30]"
          />
          <button
            id="btn-send-conversational"
            type="submit"
            disabled={!customQuestion.trim() && !inputText.trim() || loading}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
              (customQuestion.trim() || inputText.trim()) && !loading
                ? 'bg-[#bf9b30] text-black hover:bg-[#a68423]'
                : 'bg-stone-100 text-stone-300 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
