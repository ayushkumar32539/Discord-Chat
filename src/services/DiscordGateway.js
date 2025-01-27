class DiscordGateway {
    constructor(token) {
        this.token = token;
        this.ws = null;
        this.heartbeatInterval = null;
        this.sequence = null;
        this.sessionId = null;
        this.botId = null;
        this.messageCallbacks = new Set();
        this.userThread = null; // Store the user's thread
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
            clearInterval(this.heartbeatInterval);
        };
    }

    handleGatewayMessage(data) {
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
                    console.log('Received MESSAGE_CREATE:', {
                        content: d.content,
                        author: d.author.username,
                        id: d.id,
                        channelId: d.channel_id,
                        reference: d.message_reference,
                        isReply: !!d.message_reference
                    });
                    
                    // Don't process messages from self
                    if (d.author.id !== this.botId) {
                        this.messageCallbacks.forEach(callback => {
                            try {
                                callback({
                                    ...d,
                                    reference: d.message_reference
                                });
                            } catch (error) {
                                console.error('Error in message callback:', error);
                            }
                        });
                    }
                } else if (t === 'READY') {
                    this.sessionId = d.session_id;
                    this.botId = d.user.id;
                    console.log('Gateway ready, session ID:', this.sessionId, 'botId:', this.botId);
                }
                break;
            default:
                console.log('Unhandled gateway op:', op, 'type:', t);
        }
    }

    // Add callback for new messages
    onMessage(callback) {
        this.messageCallbacks.add(callback);
        return () => this.messageCallbacks.delete(callback);
    }

    identify() {
        const payload = {
            op: 2,
            d: {
                token: this.token,
                intents: 32767, // Enable all intents including MESSAGE_CONTENT
                properties: {
                    os: 'linux',
                    browser: 'my_library',
                    device: 'my_library'
                }
            }
        };
        this.ws.send(JSON.stringify(payload));
    }

    startHeartbeat(interval) {
        this.heartbeatInterval = setInterval(() => {
            this.ws.send(JSON.stringify({
                op: 1,
                d: this.sequence
            }));
        }, interval);
    }

    async createOrGetUserThread(channelId, userId) {
        try {
            // Try to find existing thread for the user
            const response = await fetch(`http://localhost:3001/api/discord/threads/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.threadId) {
                this.userThread = data.threadId;
                return data.threadId;
            }

            // If no thread exists, create a new one
            const createResponse = await fetch('http://localhost:3001/api/discord/threads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
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

    async sendMessage(channelId, content, userId) {
        if (!channelId) {
            throw new Error('Channel ID is required');
        }

        try {
            // Ensure user has a thread
            const threadId = await this.createOrGetUserThread(channelId, userId);

            console.log('Sending message to thread:', { threadId, content });
            const response = await fetch('http://localhost:3001/api/discord/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    threadId,
                    content
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async resolveThread(channelId, userId) {
        try {
            const threadId = await this.createOrGetUserThread(channelId, userId);
            
            const response = await fetch(`http://localhost:3001/api/discord/threads/${threadId}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error resolving thread:', error);
            throw error;
        }
    }
}

export default DiscordGateway; 