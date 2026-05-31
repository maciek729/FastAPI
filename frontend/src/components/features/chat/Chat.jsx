import { useState, useRef, useEffect, useContext } from "react";
import toast from "react-hot-toast";
import { MessageCircle, Trash2, Upload, Send, User, Bot, Save } from "lucide-react";
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
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function Chat({ userId, notebookId, refreshNotebook }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [responseStyle, setResponseStyle] = useState('balanced');
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
  }, [notebookId]);

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
    const savingToast = toast.loading(t('chat.savingNote'));
    try {
      const response = await SendMessage(userId, `Stwórz krótki, zwięzły tytuł dla tych wiadomości (w języku który jest użyty), maksymalnie 5 słów: ${content.slice(0, 500)}`, [], 'brief');
      
      const title = response.status === "success" 
        ? response.response.replace(/["']/g, '').trim().slice(0, 50)
        : content.slice(0, 50);
      
      await createNote({
        user_id: userId,
        notebook_id: notebookId,
        title: title,
        content: content,
        type: "Chat AI",
        is_shared: false
      });

      toast.dismiss(savingToast);
      toast.success(t('chat.saveSuccess'));
      
      if (refreshNotebook && typeof refreshNotebook === 'function') {
        refreshNotebook();
      }
      
      setSelectedMessages([]);
    } catch (error) {
      console.error(error);
      toast.error(t('chat.saveError'));
    }
  };

  const saveBotMessageAsNote = async (content) => {
    const savingToast = toast.loading(t('chat.savingNote'));
    try {
      const response = await SendMessage(userId, `Stwórz krótki, zwięzły tytuł dla tej wiadomości (w języku który jest użyty), maksymalnie 5 słów: ${content.slice(0, 500)}`, [], 'brief');
      const title = response.status === "success" 
        ? response.response.replace(/["']/g, '').trim().slice(0, 50)
        : content.slice(0, 50);
      
      await createNote({
        user_id: userId,
        notebook_id: notebookId,
        title: title,
        content: content,
        type: "Chat AI",
        is_shared: false
      });

      toast.dismiss(savingToast);
      toast.success(t('chat.saveSuccess'));
      
      if (refreshNotebook && typeof refreshNotebook === 'function') {
        refreshNotebook();
      }
    } catch (error) {
      console.error(error);
      toast.error(t('chat.saveError'));
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await SendMessage(userId, userMessage, messages, responseStyle);

      if (data.status === "success") {
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        if (data?.quota?.warning?.triggered) {
          const remaining = data?.quota?.remaining;
          toast((tMsg) => (
            <span>
              Uwaga: zbliżasz się do miesięcznego limitu AI ({data?.quota?.warning?.threshold}%). Pozostało {remaining} kredytów.
            </span>
          ), { duration: 4500 });
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: t('chat.serverError'), type: "error" }]);
      }
    } catch (error) {
      if (error?.code === 'quota_exceeded') {
        setMessages(prev => [...prev, { role: "assistant", content: `${error.message} (Pozostało: ${error?.quota?.remaining ?? 0})`, type: "error" }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: t('chat.connectionError'), type: "error" }]);
      }
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

  const getStyleLabel = (style) => {
    switch(style) {
      case 'brief': return t('chat.styleBrief');
      case 'balanced': return t('chat.styleBalanced');
      case 'detailed': return t('chat.styleDetailed');
      default: return style;
    }
  };

  const formatContent = (text) => {
    if (!text) return "";

    const superscripts = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ'
    };

    const subscripts = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'x': 'ₓ'
    };

    return text
      .replace(/<sup>(.*?)<\/sup>/gi, (match, body) => {
        return body.split('').map(char => superscripts[char] || char).join('');
      })
      .replace(/<sub>(.*?)<\/sub>/gi, (match, body) => {
        return body.split('').map(char => subscripts[char] || char).join('');
      });
  };
  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <MessageCircle size={20} className={styles.headerIcon} />
          <h2 className={styles.chatTitle}>{t('chat.title')}</h2>
        </div>
        <button className={styles.clearBtn} onClick={clearChat} disabled={messages.length === 0}>
          <Trash2 size={16} /> {t('chat.clear')}
        </button>
      </div>

      <div className={styles.styleSelector}>
        <span className={styles.styleLabel}>{t('chat.responseStyle')}:</span>
        <div className={styles.styleButtons}>
          <button 
            className={responseStyle === 'brief' ? styles.styleBtnActive : styles.styleBtn}
            onClick={() => setResponseStyle('brief')}
            title={t('chat.styleBriefDesc')}
          >
            {getStyleLabel('brief')}
          </button>
          <button 
            className={responseStyle === 'balanced' ? styles.styleBtnActive : styles.styleBtn}
            onClick={() => setResponseStyle('balanced')}
            title={t('chat.styleBalancedDesc')}
          >
            {getStyleLabel('balanced')}
          </button>
          <button 
            className={responseStyle === 'detailed' ? styles.styleBtnActive : styles.styleBtn}
            onClick={() => setResponseStyle('detailed')}
            title={t('chat.styleDetailedDesc')}
          >
            {getStyleLabel('detailed')}
          </button>
        </div>
        <div className={styles.styleIndicator}>
          {responseStyle === 'brief' && <span className={`${styles.styleDot} ${styles.briefDot}`}>●</span>}
          {responseStyle === 'balanced' && <span className={`${styles.styleDot} ${styles.balancedDot}`}>●</span>}
          {responseStyle === 'detailed' && <span className={`${styles.styleDot} ${styles.detailedDot}`}>●</span>}
          <span className={styles.currentStyle}>{getStyleLabel(responseStyle)}</span>
        </div>
      </div>

      {selectedMessages.length > 0 && (
        <button className={styles.saveMegaBtn} onClick={saveSelectedMessagesAsNote}>
          <Save size={16} /> {t('chat.saveSelected')}
        </button>
      )}

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><MessageCircle size={48} /></div>
            <h3>{t('chat.startConversation')}</h3>
            <p>{t('chat.startDescription')}</p>
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

              {msg.role === 'assistant' ? (
                <div className={styles.messageContent}>
                  <ReactMarkdown
                    children={formatContent(msg.content)}
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    skipHtml={false}
                    components={{
                      p: ({node, ...props}) => <p style={{ margin: '0.5em 0' }} {...props} />,
                      a: ({node, ...props}) => <a style={{ color: '#007bff', textDecoration: 'underline' }} {...props} />,
                      strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                      b: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                      em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                      i: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                      sup: ({node, ...props}) => <sup style={{ fontSize: '0.75em', verticalAlign: 'super', lineHeight: 0 }} {...props} />,
                      sub: ({node, ...props}) => <sub style={{ fontSize: '0.75em', verticalAlign: 'sub', lineHeight: 0 }} {...props} />,
                    }}
                  />
                </div>
              ) : (
                <div className={styles.messageContent}>{msg.content}</div>
              )}

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
        <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
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
