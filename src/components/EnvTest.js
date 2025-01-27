import React from 'react';

const EnvTest = () => {
    const envVars = {
        DISCORD_BOT_TOKEN: process.env.REACT_APP_DISCORD_BOT_TOKEN,
        CHANNEL_ID: process.env.REACT_APP_DISCORD_CHANNEL_ID,
        NODE_ENV: process.env.NODE_ENV,
        PUBLIC_URL: process.env.PUBLIC_URL
    };

    console.log('Available environment variables:', envVars);

    return (
        <div style={{ margin: '20px', padding: '20px', border: '1px solid #ccc' }}>
            <h2>Environment Variables Test</h2>
            <div>
                <h3>Environment Status:</h3>
                <ul>
                    <li>Bot Token: {envVars.DISCORD_BOT_TOKEN ? '✅ Present' : '❌ Missing'}</li>
                    <li>Channel ID: {envVars.CHANNEL_ID ? '✅ Present' : '❌ Missing'}</li>
                    <li>Node Env: {envVars.NODE_ENV}</li>
                </ul>
            </div>
            <pre style={{ background: '#f5f5f5', padding: '10px' }}>
                {JSON.stringify(envVars, null, 2)}
            </pre>
        </div>
    );
};

export default EnvTest; 