const TweetBot = require('./tweetBot');

async function main() {
    try {
        const bot = new TweetBot();
        
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