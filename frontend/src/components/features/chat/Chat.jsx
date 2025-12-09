import { useState, useRef, useEffect, useContext } from "react";
import { Sparkles, Trash2, Upload, Send, User, Bot, Save } from "lucide-react";
import styles from "../../../css/features/Chat.module.css";
import { 
  UploadFile,
  SendMessage,
  ResetSession,
  ClearFiles
}  from "../../../services/aiService";
import { createNote } from "../../../services/noteService";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";

export default function Chat({ userId, notebookId }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { language } = useContext(LanguageContext);

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations[language];
    
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) return key;
    }
    
    if (typeof translation === 'string' && Object.keys(params).length > 0) {
      return translation.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] || match;
      });
    }
    
    return translation || key;
  };

  useEffect(() => {
    resetServerSession();
    setMessages([]);
    setFile(null);
    setInputValue('');
  }, []);

  const resetServerSession = async () => {
    try {
      await ResetSession();
    } catch (error) {
      console.error(error);
    }
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleFileChange = (e) => { const selectedFile = e.target.files[0]; if (selectedFile) setFile(selectedFile); };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => { e.preventDefault(); const droppedFile = e.dataTransfer.files[0]; if (droppedFile) setFile(droppedFile); };

  const handleFileUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: "user", content: t('chat.fileUploaded', { fileName: file.name }), type: "file" }]);

    try {
      const data = await UploadFile(file);

      if (data.status === "success") {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: t('chat.fileSuccess', { fileName: file.name }), type: "success" }
        ]);
        setFile(null);
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: t('chat.fileError'), type: "error" }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: t('chat.connectionError'), type: "error" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectMessage = (index) => {
    setSelectedMessages(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      return [...prev, index].slice(-10);
    });
  };

  const saveSelectedMessagesAsNote = async () => {
    if (selectedMessages.length === 0) return;
    const content = selectedMessages.map(i => messages[i].content).join("\n\n");
    try {
      await createNote({
        user_id: userId,
        notebook_id: notebookId,
        title: content.slice(0, 50),//WIEM ZMIENIE TO ALE MI SIĘ DZISIAJ NIE CHCE <3
        content,
        type: "Chat AI",
        is_shared: false
      });
      alert(t('chat.saveSuccess'));
      setSelectedMessages([]);
    } catch (error) {
      console.error(error);
      alert(t('chat.saveError'));
    }
  };

  const saveBotMessageAsNote = async (content) => {
    try {
      await createNote({
        user_id: userId,
        notebook_id: notebookId,
        title: content.slice(0, 50),
        content,
        type: "Chat AI",
        is_shared: false
      });
      alert(t('chat.saveSuccess'));
    } catch (error) {
      console.error(error);
      alert(t('chat.saveError'));
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await SendMessage(userMessage, messages);

      if (data.status === "success") {
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: t('chat.serverError'), type: "error" }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: t('chat.connectionError'), type: "error" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const clearChat = async () => {
    try {
      await ClearFiles();
      await ResetSession();
    } catch (error) {
      console.error(error);
    } finally {
      setMessages([]);
      setFile(null);
      setSelectedMessages([]);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <Sparkles size={20} className={styles.headerIcon} />
          <h2 className={styles.chatTitle}>{t('chat.title')}</h2>
        </div>
        <button className={styles.clearBtn} onClick={clearChat} disabled={messages.length === 0}>
          <Trash2 size={16} /> {t('chat.clear')}
        </button>
      </div>

      {selectedMessages.length > 0 && (
        <button className={styles.saveMegaBtn} onClick={saveSelectedMessagesAsNote}>
          <Save size={16} /> {t('chat.saveSelected')}
        </button>
      )}

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Sparkles size={48} /></div>
            <h3>{t('chat.startConversation')}</h3>
            <p>{t('chat.startDescription')}</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
              <div className={styles.avatar}>{msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}</div>
              <div className={styles.messageContent}>{msg.content}</div>
              {msg.role === 'assistant' && (
                <div className={styles.dymekActions}>
                  <button className={styles.saveBtn} onClick={() => saveBotMessageAsNote(msg.content)} title={t('chat.saveSingle')}>
                    <Save size={14} />
                  </button>
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(index)}
                    onChange={() => toggleSelectMessage(index)}
                    title={t('chat.selectForNote')}
                  />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.avatar}><Bot size={18} /></div>
            <div className={styles.typingIndicator}><span></span><span></span><span></span></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {file && (
        <div className={styles.filePreview}>
          <span>📎 {file.name}</span>
          <button onClick={() => setFile(null)}>✕</button>
          <button onClick={handleFileUpload} disabled={isLoading}>{t('chat.upload')}</button>
        </div>
      )}

      <div className={styles.inputContainer}>
        <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} title={t('chat.uploadFile')}>
          <Upload size={20} />
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" />
        <textarea
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t('chat.messagePlaceholder')}
          rows={1}
          disabled={isLoading}
        />
        <button className={styles.sendBtn} onClick={sendMessage} disabled={!inputValue.trim() || isLoading}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}