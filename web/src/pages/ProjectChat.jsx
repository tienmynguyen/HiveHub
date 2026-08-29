import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import socket, { joinProjectRoom } from '../services/socket';
import { Send, MessageSquare } from 'lucide-react';

const ProjectChat = () => {
  const { activeProject, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeProject?.project_id) {
      fetchChatHistory();
      joinProjectRoom(activeProject.project_id);
    }
  }, [activeProject]);

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      if (msg && String(msg.project_id || msg.projectId) === String(activeProject?.project_id)) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [activeProject]);

  const fetchChatHistory = async () => {
    try {
      const res = await api.get(`/chat/getallmessage?projectId=${activeProject.project_id}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
      scrollToBottom();
    } catch (e) {
      console.error('Fetch chat error', e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeProject) return;

    const content = inputText;
    setInputText('');

    try {
      const res = await api.post('/chat/addmessage', {
        user_id: Number(user.user_id),
        message: content,
        project_id: String(activeProject.project_id),
      });

      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  if (!activeProject) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Vui lòng chọn dự án để vào phòng Chat</div>;
  }

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Mobile-styled Chat Header matching Image4 */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '22px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeProject.projectName}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>2 thành viên trong phòng chat dự án</p>
        </div>
      </div>

      {/* Chat Messages Container matching Image4 */}
      <div className="glass-panel" style={{ flex: 1, padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', fontStyle: 'italic' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} />
              Chưa có tin nhắn nào. Nhập tin nhắn để trao đổi cùng đội ngũ!
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMe = Number(m.user_id || m.userId) === Number(user?.user_id);
              const senderName = m.users?.username || m.userName || m.username || 'Thành viên';
              const text = m.message || m.content || m.messageContent;

              return (
                <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '65%', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  {/* Left Avatar for Other User (Matching Image4) */}
                  {!isMe && (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#8b5cf6', color: '#fff', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        {senderName}
                      </span>
                    )}

                    {/* Chat Bubble (Image4: Right bubble in Orange, Left bubble in White) */}
                    <div className={isMe ? 'chat-bubble-me' : 'chat-bubble-other'} style={{ fontSize: '14px', lineHeight: '1.4' }}>
                      <div>{text}</div>
                      <div style={{ fontSize: '10px', opacity: 0.75, textAlign: 'right', marginTop: '4px' }}>
                        {new Date(m.date || m.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Bar with Circular Orange Button matching Image4 */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhập tin nhắn..."
            style={{ flex: 1, padding: '14px 20px', borderRadius: '999px', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
          />
          <button
            type="submit"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,149,0,0.4)',
              flexShrink: 0,
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProjectChat;
