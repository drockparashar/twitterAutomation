const TweetBot = require('./tweetBot');
const http = require('http');

async function main() {
    try {
        const bot = new TweetBot();
        
        // Create a simple HTTP server to keep the service alive
        const server = http.createServer((req, res) => {
            res.writeHead(200);
            res.end('Bot is running');
        });

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\nReceived SIGINT. Stopping bot...');
            bot.stopHourlyTweets();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\nReceived SIGTERM. Stopping bot...');
            bot.stopHourlyTweets();
            process.exit(0);
        });

        // Start the bot
        await bot.startHourlyTweets();
        
    } catch (error) {
        console.error('Error starting bot:', error);
        process.exit(1);
    }
}

main();
