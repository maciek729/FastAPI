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
    e.currentTarget.classList.add(styles.dragOver);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove(styles.dragOver);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove(styles.dragOver);
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
            content: `✅ Plik "${file.name}" został pomyślnie przetworzony! Możesz teraz zadawać pytania o jego zawartość.`,
            type: "success"
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `Błąd przetwarzania pliku: ${data.error || "Nieznany błąd"}`, type: "error" }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Błąd połączenia z serwerem", type: "error" }
      ]);
    } finally {
      setIsLoading(false);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: "user", content: message, type: "text" }]);
    setInputValue('');

    try {
      const conversation = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch("http://localhost:8000/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: message, 
          conversation: conversation 
        })
      });

      const data = await response.json();
      if (data.status === "success") {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: data.response, type: "text" }
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
      <div className={styles.chatWrapper}>
        {/* Header */}
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderContent}>
            <div className={styles.chatLogo}>
              <div className={styles.chatLogoIcon}>
                <Sparkles className={styles.chatLogoSparkles} />
              </div>
              <div className={styles.chatLogoText}>zdAI to!</div>
            </div>
            <div className={styles.chatHeaderActions}>
              <button 
                className={styles.chatClearBtn}
                onClick={clearChat}
                disabled={messages.length === 0}
              >
                <Trash2 size={16} />
                <span>Wyczyść</span>
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className={styles.chatMessagesContainer}>
          <div className={styles.chatMessages}>
            {messages.length === 0 ? (
              <div className={styles.chatWelcome}>
                <div className={styles.chatWelcomeIcon}>
                  <Sparkles size={32} />
                </div>
                <h3>Witaj w Chat AI!</h3>
                <p>Zadaj pytanie lub prześlij plik, aby rozpocząć konwersację.</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`${styles.chatMessage} ${msg.role === 'user' ? styles.chatMessageUser : styles.chatMessageAssistant} ${msg.type === 'error' ? styles.error : ''} ${msg.type === 'success' ? styles.success : ''}`}
                >
                  <div className={styles.chatMessageAvatar}>
                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className={styles.chatMessageContent}>
                    <div className={styles.chatMessageText}>
                      {msg.content}
                    </div>
                    {msg.type === 'file' && (
                      <div className={styles.chatFileIndicator}>📎</div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className={`${styles.chatMessage} ${styles.chatMessageAssistant}`}>
                <div className={styles.chatMessageAvatar}>
                  <Bot size={20} />
                </div>
                <div className={styles.chatMessageContent}>
                  <div className={styles.chatTypingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* File Upload */}
        <div className={styles.chatFileSection}>
          <div 
            className={`${styles.chatFileDropZone} ${file ? styles.hasFile : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              ref={fileInputRef}
              type="file"
              className={styles.chatFileInput}
              onChange={handleFileChange}
              accept=".pdf,.txt,.doc,.docx"
            />
            <Upload className={styles.chatUploadIcon} />
            <div className={styles.chatUploadText}>
              <span>{file ? `Wybrany plik: ${file.name}` : 'Przeciągnij plik lub kliknij, aby wybrać'}</span>
              <small>Obsługiwane formaty: PDF, TXT, DOC, DOCX</small>
            </div>
          </div>
          {file && (
            <button 
              onClick={handleFileUpload}
              disabled={isLoading}
              className={styles.chatSendBtn}
              style={{ marginTop: '12px', width: '100%' }}
            >
              {isLoading ? 'Przesyłanie...' : 'Prześlij plik'}
            </button>
          )}
        </div>

        {/* Input */}
        <div className={styles.chatInputSection}>
          <div className={styles.chatInputWrapper}>
            <textarea
              className={styles.chatInput}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Wpisz swoją wiadomość..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className={styles.chatSendBtn}
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
            >
              <Send size={20} className={isLoading ? 'spinning' : ''} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}