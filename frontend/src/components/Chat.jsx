// import { useState, useRef, useEffect } from 'react';

// export default function AIChat() {
//   const [messages, setMessages] = useState([]);
//   const [inputValue, setInputValue] = useState('');
//   const [file, setFile] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const messagesEndRef = useRef(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const handleFileChange = (e) => {
//     setFile(e.target.files[0]);
//   };

//   const uploadFile = async () => {
//     if (!file) {
//       alert("Wybierz plik TXT lub PDF.");
//       return;
//     }

//     setIsLoading(true);
//     const formData = new FormData();
//     formData.append("file", file);

//     try {
//       const response = await fetch("http://localhost:8000/ai/uploadfile", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await response.json();

//       if (data.status === "success") {
//         setMessages(prev => [
//           ...prev,
//           { role: "user", content: `Wczytano plik: ${file.name}` },
//           { 
//             role: "assistant", 
//             content: "Dokładnie przeanalizowano dokument. Możesz teraz zadawać konkretne pytania o jego zawartość." 
//           }
//         ]);
//       } else {
//         setMessages(prev => [
//           ...prev,
//           { role: "assistant", content: `❌ ${data.error || "Błąd przetwarzania pliku"}` }
//         ]);
//       }
//     } catch (error) {
//       setMessages(prev => [
//         ...prev,
//         { role: "assistant", content: "❌ Błąd połączenia z serwerem" }
//       ]);
//     } finally {
//       setIsLoading(false);
//       setFile(null);
//       document.getElementById("file-input").value = "";
//     }
//   };

//   const sendMessage = async () => {
//     const message = inputValue.trim();
//     if (!message) return;

//     setIsLoading(true);
//     setMessages(prev => [...prev, { role: "user", content: message }]);
//     setInputValue('');

//     try {
//       const conversation = messages.map(msg => ({
//         role: msg.role,
//         content: msg.content
//       }));

//       const response = await fetch("http://localhost:8000/ai/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ 
//           message: message, 
//           conversation: conversation 
//         })
//       });

//       const data = await response.json();
//       if (data.status === "success") {
//         setMessages(prev => [
//           ...prev,
//           { role: "assistant", content: data.response }
//         ]);
//       } else {
//         setMessages(prev => [
//           ...prev,
//           { role: "assistant", content: "❨ Błąd przetwarzania zapytania" }
//         ]);
//       }
//     } catch (error) {
//       setMessages(prev => [
//         ...prev,
//         { role: "assistant", content: "❨ Błąd połączenia z serwerem" }
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   return (
//     <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
//       <h2 className="text-2xl font-bold mb-4">📝 AI Document Analyzer</h2>
      
//       <div className="mb-4 h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
//         {messages.map((msg, index) => (
//           <div 
//             key={index} 
//             className={`mb-3 ${msg.role === 'user' ? 'text-gray-800' : 'text-blue-600 font-semibold'}`}
//           >
//             <span className="font-bold">{msg.role === 'user' ? 'Ty:' : 'AI:'}</span>
//             <div className="whitespace-pre-wrap">{msg.content}</div>
//           </div>
//         ))}
//         {isLoading && (
//           <div className="text-blue-600">
//             <span className="font-bold">AI:</span> Przetwarzam...
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>

//       <div className="mb-4">
//         <input 
//           type="file" 
//           id="file-input"
//           onChange={handleFileChange}
//           accept=".txt,.pdf" 
//           className="mb-2 block w-full text-sm text-gray-500
//             file:mr-4 file:py-2 file:px-4
//             file:rounded-md file:border-0
//             file:text-sm file:font-semibold
//             file:bg-blue-50 file:text-blue-700
//             hover:file:bg-blue-100"
//           disabled={isLoading}
//         />
//         <button
//           onClick={uploadFile}
//           disabled={isLoading || !file}
//           className={`px-4 py-2 rounded-md ${isLoading || !file ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
//         >
//           Prześlij dokument
//         </button>
//       </div>

//       <div className="flex">
//         <textarea
//           value={inputValue}
//           onChange={(e) => setInputValue(e.target.value)}
//           onKeyPress={handleKeyPress}
//           placeholder="Zadaj pytanie o dokument..."
//           className="flex-1 border rounded-l-lg p-2 resize-none"
//           disabled={isLoading}
//           rows={3}
//         />
//         <button
//           onClick={sendMessage}
//           disabled={isLoading || !inputValue.trim()}
//           className={`px-4 py-2 rounded-r-lg ${isLoading || !inputValue.trim() ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600 text-white'}`}
//         >
//           Wyślij
//         </button>
//       </div>
//     </div>
//   );
// }

import { useState, useRef, useEffect } from 'react';
import '../css/Chat.css';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    
    const supportedTypes = [
      'text/plain', 
      'application/pdf', 
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp'
    ];
    
    if (droppedFile && supportedTypes.includes(droppedFile.type)) {
      setFile(droppedFile);
    } else {
      alert("Nieobsługiwany format pliku. Obsługiwane formaty: TXT, PDF, JPG, JPEG, PNG.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Wybierz plik TXT, PDF, JPG, JPEG lub PNG.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/ai/uploadfile", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        setMessages(prev => [
          ...prev,
          { role: "user", content: `Wczytano plik: ${file.name}`, type: "file" },
          { 
            role: "assistant", 
            content: data.message || "Plik został pomyślnie wczytany. Możesz teraz zadawać pytania o jego zawartość.",
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
          { role: "assistant", content: "Błąd przetwarzania zapytania", type: "error" }
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
  };

  return (
    <div className="chat-container">
      {/* Background decorations */}
      <div className="chat-bg-decorations">
        <div className="chat-bg-blob chat-bg-blob-1"></div>
        <div className="chat-bg-blob chat-bg-blob-2"></div>
        <div className="chat-bg-blob chat-bg-blob-3"></div>
      </div>

      <div className="chat-wrapper">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-logo">
              <div className="chat-logo-icon">
                <svg className="chat-logo-sparkles" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2ZM19 11L19.53 13.26L22 13.5L19.53 13.74L19 16L18.47 13.74L16 13.5L18.47 13.26L19 11ZM7 11L7.53 13.26L10 13.5L7.53 13.74L7 16L6.47 13.74L4 13.5L6.47 13.26L7 11Z"/>
                </svg>
              </div>
              <span className="chat-logo-text">AI Analyzer</span>
            </div>
            
            <div className="chat-header-actions">
              <button 
                onClick={clearChat} 
                className="chat-clear-btn"
                disabled={messages.length === 0}
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Wyczyść
              </button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="chat-messages-container">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <div className="chat-welcome-icon">
                  <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                  </svg>
                </div>
                <h3>Witaj w AI Document Analyzer</h3>
                <p>Prześlij dokument lub zadaj pytanie, aby rozpocząć</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'} ${msg.type || ''}`}
              >
                <div className="chat-message-avatar">
                  {msg.role === 'user' ? (
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                    </svg>
                  )}
                </div>
                
                <div className="chat-message-content">
                  <div className="chat-message-text">
                    {msg.content}
                  </div>
                  
                  {msg.type === 'file' && (
                    <div className="chat-file-indicator">
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-message chat-message-assistant loading">
                <div className="chat-message-avatar">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                  </svg>
                </div>
                <div className="chat-message-content">
                  <div className="chat-typing-indicator">
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

        {/* File Upload Section */}
        <div className="chat-file-section">
          <div 
            className={`chat-file-drop-zone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.pdf,.jpg,.jpeg,.png,.webp"   
              className="chat-file-input"
              disabled={isLoading}
            />
            
            {!file ? (
              <>
                <div className="chat-upload-icon">
                  <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M12,13V9H10v4H7l5,5 5-5h-3Z"/>
                  </svg>
                </div>
                <p className="chat-upload-text">
                  <span>Przeciągnij plik tutaj lub kliknij aby wybrać</span>
                  <small>Obsługiwane formaty: TXT, PDF, JPG lub PNG</small>
                </p>
              </>
            ) : (
              <div className="chat-file-preview">
                <div className="chat-file-info">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  <div className="chat-file-details">
                    <span className="chat-file-name">{file.name}</span>
                    <span className="chat-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="chat-file-remove"
                  disabled={isLoading}
                >
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 
                            5 17.59 6.41 19 12 13.41 17.59 19 
                            19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {file && (
            <button
              onClick={uploadFile}
              disabled={isLoading}
              className="chat-upload-btn small"   
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 16l-4-4h3V4h2v8h3l-4 4z"/>
              </svg>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{marginLeft: "4px"}}>
                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 
                        2 0 0 0-2 2v14a2 2 0 0 
                        0 2 2h14a2 2 0 0 
                        0 2-2zM5 5h14v4h-4a1 1 0 0 
                        0-1 .76L12.67 15l-2.34-5.24A1 
                        1 0 0 0 9 9H5V5z"/>
              </svg>
              {isLoading ? 'Przetwarzanie...' : 'Prześlij'}
            </button>
          )}
        </div>

        {/* Input Section */}
        <div className="chat-input-section">
          <div className="chat-input-wrapper">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Zadaj pytanie o dokument..."
              className="chat-input"
              disabled={isLoading}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="chat-send-btn"
            >
              {isLoading ? (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="spinning">
                  <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                </svg>
              ) : (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}