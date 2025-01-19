const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    twitter: {
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
    }
}; 