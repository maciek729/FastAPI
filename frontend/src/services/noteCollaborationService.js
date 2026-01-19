const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:8000'
  : 'https://zdaito.pl/api';

const WS_BASE_URL = window.location.origin.includes('localhost')
  ? 'ws://localhost:8000'
  : 'wss://zdaito.pl/api';

class NoteCollaborationService {
    constructor() {
        this.websocket = null;
        this.noteId = null;
        this.userId = null;
        this.listeners = {
            onPresence: [],
            onContentChange: [],
            onCursorUpdate: [],
            onSaved: [],
            onConnect: [],
            onDisconnect: []
        };
    }

    connect(noteId, userId) {
        if (this.websocket) {
            this.disconnect();
        }

        this.noteId = noteId;
        this.userId = userId;

        const wsUrl = `${WS_BASE_URL}/note-collab/ws/${noteId}/${userId}`;
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
            console.log('Connected to note collaboration');
            this.listeners.onConnect.forEach(callback => callback());
        };

        this.websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.websocket.onclose = () => {
            console.log('Disconnected from note collaboration');
            this.listeners.onDisconnect.forEach(callback => callback());
        };
    }

    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'presence':
                this.listeners.onPresence.forEach(callback => callback(message.editors));
                break;
            case 'content_change':
                this.listeners.onContentChange.forEach(callback => callback(message));
                break;
            case 'cursor':
                this.listeners.onCursorUpdate.forEach(callback => callback(message));
                break;
            case 'saved':
                this.listeners.onSaved.forEach(callback => callback(message));
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    sendContentChange(content, changes = null) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'content_change',
                content: content,
                changes: changes
            }));
        }
    }

    sendCursorUpdate(cursorPosition) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'cursor_update',
                cursor_position: cursorPosition
            }));
        }
    }

    sendSave(content, title) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'save',
                content: content,
                title: title
            }));
        }
    }

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    async getActiveEditors(noteId) {
        try {
            const response = await fetch(`${API_BASE_URL}/note-collab/${noteId}/editors`);
            if (!response.ok) throw new Error('Failed to fetch editors');
            const data = await response.json();
            return data.editors;
        } catch (error) {
            console.error('Error fetching editors:', error);
            return [];
        }
    }
}

export default new NoteCollaborationService();
