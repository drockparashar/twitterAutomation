const { TwitterApi } = require('twitter-api-v2');
const config = require('./config');

// Create a Twitter client instance with read-write permissions
const client = new TwitterApi({
    appKey: config.twitter.appKey,
    appSecret: config.twitter.appSecret,
    accessToken: config.twitter.accessToken,
    accessSecret: config.twitter.accessSecret,
}).readWrite;

module.exports = client; 