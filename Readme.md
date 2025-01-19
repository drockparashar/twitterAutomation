# Simple Deployment Steps

1. On your server:
   ```bash
   # Install Node.js if not already installed
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Clone your repository
   git clone <your-repo-url>
   cd tech-trend-bot

   # Install dependencies
   npm install

   # Create and edit .env file with your credentials
   cp .env.example .env
   nano .env

   # Start the bot
   nohup npm start > output.log 2>&1 &
   ```

2. To check if bot is running:
   ```bash
   ps aux | grep node
   ```

3. To check logs:
   ```bash
   tail -f output.log
   ```

4. To stop the bot:
   ```bash
   pkill -f "node src/index.js"
   ``` 