import { useState, useRef, useEffect } from "react";
import { Sparkles, Trash2, Upload, Send, User, Bot } from "lucide-react";
import styles from '../css/Chat.module.css';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    setMessages(prev => [
      ...prev,
      { role: "user", content: `📎 Przesłano plik: ${file.name}`, type: "file" }
    ]);

    try {
      const response = await fetch("http://localhost:8000/ai/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (data.status === "success") {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Plik "${file.name}" został pomyślnie przetworzony!`,
            type: "success"
          }
        ]);
        setFile(null);
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "❌ Błąd przetwarzania pliku", type: "error" }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Błąd połączenia z serwerem", type: "error" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation: messages.map(msg => ({ role: msg.role, content: msg.content }))
        })
      });

      const data = await response.json();

      if (data.status === "success") {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: data.response }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "Przepraszam, wystąpił błąd.", type: "error" }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Błąd połączenia z serwerem", type: "error" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setFile(null);
  };

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <Sparkles size={20} className={styles.headerIcon} />
          <h2 className={styles.chatTitle}>Chat z AI</h2>
        </div>
        <button 
          className={styles.clearBtn}
          onClick={clearChat}
          disabled={messages.length === 0}
        >
          <Trash2 size={16} />
          Wyczyść
        </button>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Sparkles size={48} />
            </div>
            <h3>Zacznij konwersację</h3>
            <p>Zadaj pytanie lub prześlij plik, aby rozpocząć</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
            >
              <div className={styles.avatar}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={styles.messageContent}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.avatar}>
              <Bot size={18} />
            </div>
            <div className={styles.typingIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload */}
      {file && (
        <div className={styles.filePreview}>
          <span>📎 {file.name}</span>
          <button onClick={() => setFile(null)}>✕</button>
          <button onClick={handleFileUpload} disabled={isLoading}>
            Prześlij
          </button>
        </div>
      )}

      {/* Input */}
      <div className={styles.inputContainer}>
        <button 
          className={styles.uploadBtn}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={20} />
        </button>
        <input 
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".pdf,.txt,.doc,.docx"
        />
        <textarea
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Napisz wiadomość..."
          rows={1}
          disabled={isLoading}
        />
        <button 
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={!inputValue.trim() || isLoading}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}