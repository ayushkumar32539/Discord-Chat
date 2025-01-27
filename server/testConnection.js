require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    testChannel();
});

async function testChannel() {
    try {
        const channelId = process.env.DISCORD_CHANNEL_ID;
        const channel = await client.channels.fetch(channelId);
        console.log('Channel found:', {
            name: channel.name,
            type: channel.type,
            permissions: channel.permissionsFor(client.user)?.toArray()
        });
        
        // Test sending a message
        const message = await channel.send('Test message from bot');
        console.log('Test message sent successfully:', message.id);
    } catch (error) {
        console.error('Test failed:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
    } finally {
        client.destroy();
    }
}

client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => console.log('Login successful'))
    .catch(error => console.error('Login failed:', error)); 