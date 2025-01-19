const googleTrends = require('google-trends-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { TwitterApi } = require('twitter-api-v2');
const config = require('./config');
const logger = require('./logger');

class TweetBot {
    constructor() {
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        this.geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Initialize Twitter client for posting
        const client = new TwitterApi({
            appKey: config.twitter.appKey,
            appSecret: config.twitter.appSecret,
            accessToken: config.twitter.accessToken,
            accessSecret: config.twitter.accessSecret,
        });
        
        this.twitterClient = client.readWrite;
        this.isRunning = false;

        // Tech categories for random selection
        this.techCategories = [
            'Artificial Intelligence',
            'Machine Learning',
            'Blockchain',
            'Cybersecurity',
            'Cloud Computing',
            'Data Science',
            'Internet of Things',
            'Mobile Technology',
            'Software Development',
            'Tech Startups'
        ];

        // Time ranges for random selection
        this.timeRanges = [
            'now 1-H',
            'now 4-H',
            'now 1-d',
            'today 1-m',
            'today 3-m'
        ];
    }

    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    async fetchTrendingTopics() {
        try {
            // Get random parameters
            const category = this.getRandomElement(this.techCategories);
            const timeRange = this.getRandomElement(this.timeRanges);

            console.log(`Fetching trends for category: ${category}`);
            console.log(`Time range: ${timeRange}`);

            // Fetch real-time trends for India
            const [realTimeTrends, relatedQueries] = await Promise.all([
                googleTrends.realTimeTrends({
                    geo: 'IN',
                    category: 't'
                }),
                googleTrends.relatedQueries({
                    keyword: category,
                    geo: 'IN',
                    time: timeRange
                })
            ]);

            // Parse the responses
            const realTimeData = JSON.parse(realTimeTrends);
            const queriesData = JSON.parse(relatedQueries);

            // Get trending stories and related queries
            const trendingStories = realTimeData.storySummaries?.trendingStories || [];
            const relatedTopics = queriesData.default?.rankedList?.[0]?.rankedKeyword || [];

            // Combine and format the data
            const trend = {
                name: `${category} Trends in India`,
                mainTopic: trendingStories[0]?.title || category,
                relatedTopics: relatedTopics
                    .slice(0, 3)
                    .map(topic => topic.query)
                    .join(', '),
                context: trendingStories[0]?.articleCount 
                    ? `Trending with ${trendingStories[0].articleCount} related articles`
                    : 'Currently trending in India'
            };

            logger.info('Successfully fetched trending tech topic:', trend);
            return trend;

        } catch (error) {
            logger.error('Error fetching trends:', error);
            // If real-time trends fail, fallback to daily trends
            try {
                const dailyTrends = await googleTrends.dailyTrends({
                    geo: 'IN'
                });
                
                const data = JSON.parse(dailyTrends);
                const techTrend = data.default.trendingSearchesDays[0].trendingSearches[0];
                
                const trend = {
                    name: 'Tech Trends India',
                    mainTopic: techTrend.title.query,
                    relatedTopics: techTrend.relatedQueries.join(', '),
                    context: `Trending with ${techTrend.formattedTraffic} searches`
                };

                logger.info('Successfully fetched fallback trend:', trend);
                return trend;
            } catch (fallbackError) {
                logger.error('Fallback error:', fallbackError);
                throw fallbackError;
            }
        }
    }

    async generateTweet(trend) {
        try {
            const prompt = `Generate a detailed tweet about this tech trend in India, using as many characters as possible (but strictly under 280 characters):
                Main Topic: ${trend.mainTopic}
                Related Topics: ${trend.relatedTopics}
                Context: ${trend.context}
                
                Requirements:
                - MUST use close to 280 characters (aim for 270-279)
                - Include relevant hashtags at the end
                - Pack in as much information as possible while maintaining readability
                - Use abbreviations where appropriate to save space
                - Include key statistics or numbers if available
                - End with a strong call to action or thought-provoking point
                - Add #TechIndia and #IndianTech hashtags
                
                Format the tweet to maximize information density while staying under 280 characters.`;

            const result = await this.geminiModel.generateContent(prompt);
            const tweet = result.response.text().trim();
            
            if (tweet.length > 280) {
                logger.warn('Tweet exceeded 280 characters, truncating...');
                return tweet.substring(0, 277) + '...';
            }
            
            if (tweet.length < 240) {
                logger.warn('Tweet is shorter than desired, requesting regeneration...');
                return this.generateTweet(trend); // Retry for a longer tweet
            }

            return tweet;
        } catch (error) {
            logger.error('Error generating tweet:', error);
            throw error;
        }
    }

    async postTweet(tweet) {
        try {
            console.log('Posting tweet...');
            const result = await this.twitterClient.v2.tweet(tweet);
            logger.info('Tweet posted successfully:', result);
            return result;
        } catch (error) {
            logger.error('Error posting tweet:', error);
            throw error;
        }
    }

    async startHourlyTweets() {
        if (this.isRunning) {
            console.log('Bot is already running!');
            return;
        }

        this.isRunning = true;
        console.log('Starting hourly tweet bot...');
        console.log(`Next tweet will be posted at ${this.getNextTweetTime()}`);

        // Run immediately for the first time
        await this.runWorkflow();

        // Schedule hourly tweets
        this.interval = setInterval(async () => {
            try {
                await this.runWorkflow();
                console.log(`Next tweet scheduled for ${this.getNextTweetTime()}`);
            } catch (error) {
                logger.error('Error in scheduled tweet:', error);
                console.error('Failed to post scheduled tweet. Will retry next hour.');
            }
        }, 60 * 60 * 1000); // 1 hour in milliseconds
    }

    stopHourlyTweets() {
        if (this.interval) {
            clearInterval(this.interval);
            this.isRunning = false;
            console.log('Hourly tweet bot stopped.');
        }
    }

    getNextTweetTime() {
        const now = new Date();
        const nextTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        return nextTime.toLocaleTimeString();
    }

    async runWorkflow() {
        try {
            console.log('\n=================================');
            console.log(`Starting workflow at ${new Date().toLocaleString()}`);
            console.log('=================================\n');

            console.log('Fetching trending tech topics from India...');
            const trend = await this.fetchTrendingTopics();
            
            if (!trend) {
                console.log('\nNo tech-related trending topics found.');
                return;
            }

            console.log('\nTop Trending Tech Topic:');
            console.log('------------------------------');
            console.log(`Category: ${trend.name}`);
            console.log(`Main Topic: ${trend.mainTopic}`);
            console.log(`Related Topics: ${trend.relatedTopics}`);
            console.log(`Context: ${trend.context}`);
            console.log('------------------------------');

            // Generate tweet
            console.log('\nGenerating tweet...');
            const tweet = await this.generateTweet(trend);
            console.log('\nGenerated Tweet:');
            console.log('------------------------------');
            console.log(tweet);
            console.log('------------------------------');
            console.log(`Character count: ${tweet.length}/280`);
            console.log(`Space remaining: ${280 - tweet.length} characters`);

            // Post the tweet
            const result = await this.postTweet(tweet);
            console.log('\nTweet posted successfully!');
            console.log('Tweet URL:', `https://twitter.com/user/status/${result.data.id}`);
            console.log('\n=================================\n');

        } catch (error) {
            logger.error('Workflow error:', error);
            console.error('Failed to complete workflow. Will retry next hour.');
        }
    }

    async fetchRelatedKeywords() {
        try {
            const response = await googleTrends.relatedQueries({
                keyword: 'tech news',
                geo: 'US',
                time: 'now 1-d'
            });

            const results = JSON.parse(response).default.rankedList[0].rankedKeyword
                .map(item => ({
                    name: item.query,
                    score: item.value
                }))
                .slice(0, 5);

            return results;
        } catch (error) {
            logger.error('Error fetching related keywords:', error);
            return [];
        }
    }
}

module.exports = TweetBot; 