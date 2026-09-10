import { useState } from 'react';
import { apiRequest } from '../../config/api';
import './AiTutorModal.css';

const AiTutorModal = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm here to help you understand financial concepts — budgeting, credit, saving, investing basics, and more. What would you like to learn about today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newHistory = [...messages, { role: 'user', content: text }];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      // Calls your own backend, which should proxy to the AI provider
      // so no API key is ever exposed in the browser.
      const res = await apiRequest('/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory })
      });
      const data = await res.json();
      setMessages([...newHistory, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error('AI tutor request failed:', err);
      setMessages([...newHistory, { role: 'assistant', content: "Sorry, something went wrong reaching the tutor. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="tutor-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tutor-window">
        <div className="tutor-header">
          <div>
            <h3>AI Financial Tutor</h3>
            <span>Financial literacy, explained simply</span>
          </div>
          <button className="tutor-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="tutor-disclaimer">
          This is an educational tool, not financial advice. It won't recommend specific investments.
        </div>

        <div className="tutor-messages">
          {messages.map((m, i) => (
            <div key={i} className={`tutor-msg ${m.role === 'user' ? 'user' : 'bot'}`}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="tutor-msg bot typing">
              <span></span><span></span><span></span>
            </div>
          )}
        </div>

        <div className="tutor-composer">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a financial concept…"
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default AiTutorModal;