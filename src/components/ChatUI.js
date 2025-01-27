import React, { useState, useEffect, useRef } from 'react';
import './ChatUI.css';
import DiscordGateway from '../services/DiscordGateway';
import UserSelector from './UserSelector';

const ChatUI = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isResolved, setIsResolved] = useState(false);
    const messagesEndRef = useRef(null);
    const gateway = useRef(null);
    const processedMessages = useRef(new Set());
    const lastUserMessageId = useRef(null);
    // const userId = useRef(`user-${Date.now()}`); // Generate unique user ID

    const CHANNEL_ID = process.env.REACT_APP_DISCORD_CHANNEL_ID?.toString();
    const DISCORD_BOT_TOKEN = process.env.REACT_APP_DISCORD_BOT_TOKEN;

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setMessages([]);
        setIsResolved(false);
        processedMessages.current.clear();
        lastUserMessageId.current = null;
    };

    const handleResolveThread = async () => {
        try {
            await gateway.current.resolveThread(CHANNEL_ID, selectedUser.id);
            setIsResolved(true);
            alert('Thread marked as resolved!');
        } catch (error) {
            console.error('Failed to resolve thread:', error);
            alert('Failed to resolve thread. Please try again.');
        }
    };

    useEffect(() => {
        if (!CHANNEL_ID || !DISCORD_BOT_TOKEN) {
            console.error('Missing environment variables');
            return;
        }

        gateway.current = new DiscordGateway(DISCORD_BOT_TOKEN);
        
        const removeListener = gateway.current.onMessage((message) => {
            console.log('Received message:', message);
            
            // Process messages from both bots
            if (!processedMessages.current.has(message.id)) {
                processedMessages.current.add(message.id);
                
                setMessages(prev => {
                    // If it's a reply to our last message, add it
                    if (message.reference?.message_id === lastUserMessageId.current ||
                        message.author.id === process.env.REACT_APP_ASSISTANT_BOT_ID) {
                        return [...prev, {
                            id: `${message.id}-${Date.now()}`,
                            messageId: message.id,
                            content: message.content,
                            author: message.author.username,
                            timestamp: new Date(message.timestamp),
                            isBot: message.author.bot,
                            isAssistant: message.author.id === process.env.REACT_APP_ASSISTANT_BOT_ID,
                            isUser: false,
                            replyTo: message.reference?.message_id
                        }];
                    }
                    return prev;
                });
            }
        });

        gateway.current.connect();
        setIsConnected(true);

        return () => {
            removeListener();
            if (gateway.current.ws) {
                gateway.current.ws.close();
            }
        };
    }, [CHANNEL_ID, DISCORD_BOT_TOKEN]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !CHANNEL_ID || !selectedUser) return;

        const messageId = `user-${Date.now()}`;
        try {
            setMessages(prev => [...prev, {
                id: messageId,
                messageId,
                content: inputMessage,
                author: selectedUser.name,
                timestamp: new Date(),
                isUser: true,
                isBot: false,
                isAssistant: false
            }]);

            const sentMessage = await gateway.current.sendMessage(
                CHANNEL_ID, 
                inputMessage,
                `${selectedUser.name}[${selectedUser.id}][${selectedUser.email}]`
            );
            lastUserMessageId.current = sentMessage.id;
            setInputMessage('');
        } catch (error) {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        }
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const renderMessage = (msg) => {
        const messageClass = `message ${
            msg.isUser ? 'user-message' : 
            msg.isAssistant ? 'assistant-message' : 
            'bot-message'
        } ${msg.replyTo ? 'reply' : ''}`;

        return (
            <div key={msg.id} className={messageClass}>
                {msg.replyTo && (
                    <div className="message-reply-indicator">
                        Replying to previous message
                    </div>
                )}
                <div className="message-header">
                    <span className="author">{msg.author}</span>
                    <span className="timestamp">
                        {msg.timestamp.toLocaleTimeString()}
                    </span>
                </div>
                <div className="message-content">{msg.content}</div>
            </div>
        );
    };

    return (
        <div className="chat-interface">
            <UserSelector 
                onSelectUser={handleUserSelect} 
                selectedUserId={selectedUser?.id}
            />
            
            {selectedUser ? (
                <div className="chat-container">
                    <div className="chat-header">
                        <div className="header-info">
                            <h2>Chat with {selectedUser.name}</h2>
                            <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        {messages.length > 0 && !isResolved && (
                            <button 
                                className="resolve-button"
                                onClick={handleResolveThread}
                            >
                                Mark as Resolved
                            </button>
                        )}
                    </div>
                    
                    <div className="messages-container">
                        {messages.map(renderMessage)}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="input-container">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type a message..."
                            disabled={isResolved}
                        />
                        <button type="submit" disabled={isResolved}>
                            Send
                        </button>
                    </form>
                </div>
            ) : (
                <div className="select-user-prompt">
                    Please select a user to start chatting
                </div>
            )}
        </div>
    );
};

export default ChatUI; 