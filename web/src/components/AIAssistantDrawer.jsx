import React, { useState } from 'react';
import api from '../services/api';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const AIAssistantDrawer = ({ isOpen, onClose, activeProject, user }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Chào bạn! Tôi là Trợ Lý AI của HiveHub. Tôi có thể giúp bạn tổng hợp Daily Standup, tạo báo cáo Sprint hoặc giải đáp quy trình Agile/Scrum!',
      quickActions: ['Daily Standup', 'Lập báo cáo dự án', 'Hướng dẫn quy trình Scrum'],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || !user) return;

    const userMsg = { id: Date.now(), sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Exact backend route: POST /agent/chat with { userId, message, mode: "agent" }
      const res = await api.post('/agent/chat', {
        userId: Number(user.user_id),
        message: query,
        mode: 'agent',
      });

      const responseData = res.data;
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: responseData.answer || responseData.response || responseData.message || 'Đã xử lý yêu cầu của bạn.',
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI agent error', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: 'Xin lỗi, không thể kết nối tới Trợ Lý AI lúc này. Vui lòng kiểm tra lại dịch vụ backend.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        position: 'fixed',
        top: '64px',
        right: 0,
        width: '420px',
        height: 'calc(100vh - 64px)',
        zIndex: 50,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Bot size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>HiveHub AI Agent</h3>
            <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Powered by Gemini / DeepSeek LLM
            </div>
          </div>
        </div>

        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              background: m.sender === 'user' ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: m.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)',
              fontSize: '13px',
              lineHeight: '1.5',
              whiteSpace: 'pre-line',
            }}
          >
            <div>{m.text}</div>

            {/* Quick action chips */}
            {m.quickActions && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                {m.quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(action)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-muted)' }}>
            🤖 AI đang phân tích dữ liệu dự án...
          </div>
        )}
      </div>

      {/* Footer Input */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ display: 'flex', gap: '8px' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi AI hoặc ra lệnh (vd: Daily Standup)..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
          />
          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 14px' }}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistantDrawer;
