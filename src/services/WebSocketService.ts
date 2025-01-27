import { ENV } from '../config/env';

class WebSocketService {
    private ws: WebSocket | null = null;
    private token: string;
    private messageCallbacks: Set<(message: any) => void>;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private sequence: number | null = null;
    private sessionId: string | null = null;
    private botId: string | null = null;
    private userThread: string | null = null;

    constructor(token: string) {
        this.token = token;
        this.messageCallbacks = new Set();
    }

    connect() {
        this.ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
        
        this.ws.onopen = () => {
            console.log('Connected to Discord Gateway');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleGatewayMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from Discord Gateway');
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private handleGatewayMessage(data: any) {
        const { op, d, s, t } = data;
        
        if (s) this.sequence = s;

        switch (op) {
            case 10: // Hello
                this.startHeartbeat(d.heartbeat_interval);
                this.identify();
                break;
            case 11: // Heartbeat ACK
                console.log('Heartbeat acknowledged');
                break;
            case 0: // Dispatch
                if (t === 'MESSAGE_CREATE') {
                    this.handleMessageCreate(d);
                } else if (t === 'READY') {
                    this.sessionId = d.session_id;
                    this.botId = d.user.id;
                }
                break;
        }
    }

    private handleMessageCreate(message: any) {
        if (message.author.id !== this.botId) {
            this.messageCallbacks.forEach(callback => {
                try {
                    callback(message);
                } catch (error) {
                    console.error('Error in message callback:', error);
                }
            });
        }
    }

    private identify() {
        const payload = {
            op: 2,
            d: {
                token: this.token,
                intents: 32767,
                properties: {
                    os: 'iOS',
                    browser: 'Discord iOS App',
                    device: 'iPhone'
                }
            }
        };
        this.ws?.send(JSON.stringify(payload));
    }

    private startHeartbeat(interval: number) {
        this.heartbeatInterval = setInterval(() => {
            this.ws?.send(JSON.stringify({
                op: 1,
                d: this.sequence
            }));
        }, interval);
    }

    async createOrGetUserThread(channelId: string, userId: string): Promise<string> {
        try {
            const response = await fetch(`${ENV.API_URL}/api/discord/threads/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.threadId) {
                this.userThread = data.threadId;
                return data.threadId;
            }

            const createResponse = await fetch(`${ENV.API_URL}/api/discord/threads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    channelId,
                    userId,
                    name: `Support-${userId}`
                })
            });

            if (!createResponse.ok) {
                throw new Error(`HTTP error! status: ${createResponse.status}`);
            }

            const newThread = await createResponse.json();
            this.userThread = newThread.threadId;
            return newThread.threadId;
        } catch (error) {
            console.error('Error managing thread:', error);
            throw error;
        }
    }

    async sendMessage(channelId: string, content: string, userId: string) {
        try {
            const threadId = await this.createOrGetUserThread(channelId, userId);
            
            const response = await fetch(`${ENV.API_URL}/api/discord/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    threadId,
                    content
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    onMessage(callback: (message: any) => void) {
        this.messageCallbacks.add(callback);
        return () => this.messageCallbacks.delete(callback);
    }

    disconnect() {
        this.ws?.close();
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}

export default WebSocketService; 