const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
    discord: {
        botToken: process.env.DISCORD_BOT_TOKEN,
        assistantBotToken: process.env.ASSISTANT_BOT_TOKEN,
        channelId: process.env.DISCORD_CHANNEL_ID,
    },
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
    },
    security: {
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    }
};

// Validate required configuration
const validateConfig = () => {
    const requiredFields = [
        ['discord.botToken', config.discord.botToken],
        ['discord.assistantBotToken', config.discord.assistantBotToken],
        ['discord.channelId', config.discord.channelId],
    ];

    const missingFields = requiredFields
        .filter(([, value]) => !value)
        .map(([field]) => field);

    if (missingFields.length > 0) {
        throw new Error(
            `Missing required configuration fields: ${missingFields.join(', ')}\n` +
            'Please check your .env file and ensure all required fields are set.'
        );
    }
};

validateConfig();

module.exports = config; 