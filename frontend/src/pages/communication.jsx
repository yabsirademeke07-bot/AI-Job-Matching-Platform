import React, { useState } from 'react';
import { Send, User, Building2, Phone, Video } from 'lucide-react';

const Communication = () => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'employer', text: 'ሰላም ተከባ! CV ህን አይተነዋል። በ React እና Node.js ያለህ ልምድ በጣም አሪፍ ነው።', time: '10:00 AM' },
    { id: 2, sender: 'seeker', text: 'ሰላም ጌታቸው! በጣም አመሰግናለሁ። ፕሮጀክቶቼን በ Github ላይ ማየት ትችላላችሁ።', time: '10:02 AM' },
    { id: 3, sender: 'employer', text: 'እሺ መልካም። ነገ 4:00 ሰዓት ላይ የኦንላይን Interview ማድረግ እንችላለን?', time: '10:05 AM' },
  ]);

  const [inputMsg, setInputMsg] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    setMessages([...messages, {
      id: messages.length + 1,
      sender: 'seeker',
      text: inputMsg,
      time: 'Just now'
    }]);
    setInputMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-rows-[auto_1fr_auto] h-[80vh]">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
              ET
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">EthioTech HR Manager</h2>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                ● Online | Employer Direct Chat
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-slate-500">
            <button className="p-2 hover:bg-slate-200 rounded-lg"><Phone className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-slate-200 rounded-lg"><Video className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="p-4 overflow-y-auto space-y-3 bg-slate-50/50">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender === 'seeker' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'seeker' 
                    ? 'bg-slate-900 text-white rounded-br-none shadow-sm' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Input Box */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="መልእክትዎን እዚህ ይጻፉ..."
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition"
          />
          <button 
            type="submit" 
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
          >
            <span>ላክ</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};

export default Communication;