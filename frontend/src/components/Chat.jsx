import { useState, useRef, useEffect } from 'react';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Wybierz plik TXT lub PDF.");
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
          { role: "user", content: `Wczytano plik: ${file.name}` },
          { 
            role: "assistant", 
            content: "Dokładnie przeanalizowano dokument. Możesz teraz zadawać konkretne pytania o jego zawartość." 
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `❌ ${data.error || "Błąd przetwarzania pliku"}` }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Błąd połączenia z serwerem" }
      ]);
    } finally {
      setIsLoading(false);
      setFile(null);
      document.getElementById("file-input").value = "";
    }
  };

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: "user", content: message }]);
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
          { role: "assistant", content: data.response }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "❨ Błąd przetwarzania zapytania" }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "❨ Błąd połączenia z serwerem" }
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

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">📝 AI Document Analyzer</h2>
      
      <div className="mb-4 h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`mb-3 ${msg.role === 'user' ? 'text-gray-800' : 'text-blue-600 font-semibold'}`}
          >
            <span className="font-bold">{msg.role === 'user' ? 'Ty:' : 'AI:'}</span>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="text-blue-600">
            <span className="font-bold">AI:</span> Przetwarzam...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mb-4">
        <input 
          type="file" 
          id="file-input"
          onChange={handleFileChange}
          accept=".txt,.pdf" 
          className="mb-2 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={isLoading}
        />
        <button
          onClick={uploadFile}
          disabled={isLoading || !file}
          className={`px-4 py-2 rounded-md ${isLoading || !file ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >
          Prześlij dokument
        </button>
      </div>

      <div className="flex">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Zadaj pytanie o dokument..."
          className="flex-1 border rounded-l-lg p-2 resize-none"
          disabled={isLoading}
          rows={3}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !inputValue.trim()}
          className={`px-4 py-2 rounded-r-lg ${isLoading || !inputValue.trim() ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600 text-white'}`}
        >
          Wyślij
        </button>
      </div>
    </div>
  );
}