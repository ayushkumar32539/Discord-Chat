const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: 'http://localhost:3000', // Your React app's URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept']
}));
app.use(express.json());

const _cache = new Set();

let primaryBot = null;
let assistantBot = null;

async function initializeBots() {
    console.log('Starting bot initialization...');
    
    // Initialize primary bot
    primaryBot = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers
        ]
    });

    // Initialize assistant bot
    assistantBot = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers
        ]
    });

    console.log('Bots initialized, setting up event handlers...');

    // Primary bot event handlers
    primaryBot.once('ready', () => {
        console.log('Primary bot is ready!');
        console.log('Primary bot logged in as:', primaryBot.user.tag);
    });

    primaryBot.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        try {
            const response = getPrimaryBotResponse(message.content);
            setTimeout(async () => {
                try {
                    await message.channel.send(response);
                } catch (error) {
                    console.error('Error sending primary bot response:', error);
                }
            }, 1000);
        } catch (error) {
            console.error('Error processing message for primary bot:', error);
        }
    });

    // Assistant bot event handlers
    assistantBot.once('ready', () => {
        console.log('Assistant bot is ready!');
        console.log('Assistant bot logged in as:', assistantBot.user.tag);
    });

    assistantBot.on('messageCreate', async (message) => {
        // Only respond in threads
        if (!message.channel.isThread()) return;
        
        // Don't respond to self or other bots except primary bot
        if (message.author.bot && message.author.id === assistantBot.user.id) return;

        try {
            // Extract user info from thread name (format: "Support-UserName[userId]")
            const threadName = message.channel.name;
            const userInfo = threadName.split('Support-')[1];
            
            if (!userInfo) return;

            // Parse the response based on the message
            const response = `Thank you for your message. How can I assist you further?`;
            
            setTimeout(async () => {
                try {
                    await message.reply(response);
                    console.log('Assistant sent response successfully');
                } catch (error) {
                    console.error('Error sending assistant bot response:', error);
                }
            }, 1000);
        } catch (error) {
            console.error('Error processing message for assistant bot:', error);
        }
    });

    // Error handlers
    primaryBot.on('error', (error) => {
        console.error('Primary bot error:', error);
    });

    assistantBot.on('error', (error) => {
        console.error('Assistant bot error:', error);
    });

    console.log('Attempting to log in bots...');
    console.log('Primary Bot Token:', process.env.DISCORD_BOT_TOKEN ? 'Present' : 'Missing');
    console.log('Assistant Bot Token:', process.env.ASSISTANT_BOT_TOKEN ? 'Present' : 'Missing');

    try {
        // Login both bots
        await Promise.all([
            primaryBot.login(process.env.DISCORD_BOT_TOKEN),
            assistantBot.login(process.env.ASSISTANT_BOT_TOKEN)
        ]);
        console.log('Both bots logged in successfully');
    } catch (error) {
        console.error('Bot login failed:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        throw error;
    }
}

// Initialize both bots when the server starts
initializeBots().catch(error => {
    console.error('Failed to initialize bots:', error);
    process.exit(1);
});

// Add these endpoints to handle threads
const threadStore = new Map(); // Store thread IDs by user ID

app.get('/api/discord/threads/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const threadId = threadStore.get(userId);
        
        if (threadId) {
            // Verify thread still exists
            try {
                const thread = await primaryBot.channels.fetch(threadId);
                if (thread) {
                    return res.json({ threadId });
                }
            } catch (error) {
                threadStore.delete(userId);
            }
        }
        
        res.json({ threadId: null });
    } catch (error) {
        console.error('Error getting thread:', error);
        res.status(500).json({ error: 'Failed to get thread' });
    }
});

app.post('/api/discord/threads', async (req, res) => {
    try {
        const { channelId, userId, name } = req.body;
        console.log('Creating thread:', { channelId, userId, name });

        if (!channelId || !userId) {
            return res.status(400).json({
                error: 'Bad Request',
                details: 'Channel ID and User ID are required'
            });
        }

        const channel = await primaryBot.channels.fetch(channelId);
        if (!channel) {
            return res.status(404).json({
                error: 'Not Found',
                details: 'Channel not found'
            });
        }

        // Create thread with user details in name
        const thread = await channel.threads.create({
            name: `Support-${name}`,
            autoArchiveDuration: 1440,
            reason: `Support thread for user ${name}`
        });

        // Store the thread ID
        threadStore.set(userId, thread.id);

        // Send initial message with user details
        await thread.send(`📝 **New Support Thread**
User: ${name}
Email: ${name.split('[')[0]}@example.com
ID: ${userId}

The user has started a support conversation. Please assist them with their inquiry.`);

        console.log('Thread created successfully:', thread.id);
        res.json({ 
            threadId: thread.id,
            name: thread.name
        });
    } catch (error) {
        console.error('Error creating thread:', error);
        res.status(500).json({ 
            error: 'Failed to create thread',
            details: error.message
        });
    }
});

// Update the message endpoint to handle threads
app.post('/api/discord/messages', async (req, res) => {
    try {
        const { threadId, content } = req.body;
        
        if (!threadId) {
            return res.status(400).json({ 
                error: 'Bad Request', 
                details: 'Thread ID is required' 
            });
        }

        if (!primaryBot?.isReady()) {
            return res.status(503).json({
                error: 'Service Unavailable',
                details: 'Bot is not ready'
            });
        }

        const thread = await primaryBot.channels.fetch(threadId);
        const message = await thread.send(content);
        
        res.json({
            success: true,
            message: message
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ 
            error: 'Failed to send message', 
            details: error.message 
        });
    }
});

// Add a test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Server is running!',
        botStatus: {
            ready: primaryBot?.isReady(),
            user: primaryBot?.user?.tag
        }
    });
});

// Add endpoint for resolving threads
app.post('/api/discord/threads/:threadId/resolve', async (req, res) => {
    try {
        const { threadId } = req.params;
        const thread = await primaryBot.channels.fetch(threadId);
        
        // Send resolution message
        await thread.send('🎉 This support thread has been marked as resolved and will be archived.');
        
        // Archive the thread
        await thread.setArchived(true);
        
        // Remove from thread store
        for (const [userId, storedThreadId] of threadStore.entries()) {
            if (storedThreadId === threadId) {
                threadStore.delete(userId);
                break;
            }
        }

        res.json({ 
            success: true,
            message: 'Thread resolved and archived'
        });
    } catch (error) {
        console.error('Error resolving thread:', error);
        res.status(500).json({ 
            error: 'Failed to resolve thread',
            details: error.message
        });
    }
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        details: err.message
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
}); 