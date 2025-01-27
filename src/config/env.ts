export const ENV = {
    DISCORD_BOT_TOKEN: 'your_bot_token',
    DISCORD_CHANNEL_ID: 'your_channel_id',
    ASSISTANT_BOT_ID: 'your_assistant_bot_id',
    API_URL: __DEV__ 
        ? Platform.select({
            ios: 'http://localhost:3001', // For iOS simulator
            android: 'http://10.0.2.2:3001', // For Android emulator
            default: 'http://localhost:3001'
          })
        : 'https://your-production-api.com'
}; 