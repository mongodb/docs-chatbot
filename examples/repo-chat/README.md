# Repo Chat

Example project for chatting with Git repositories.

The project is structured as a monorepo containing several subprojects.

1. `packages/ingest` - Contains the ingestion script and the configuration.
2. `packages/server` - Contains the server code.
3. `packages/ui` - Contains the UI code.

## Setup

1. Get the project from Github

   ```sh
   git clone https://github.com/mongodb/chatbot.git
   cd examples/repo-chat
   ```

2. Set up environment

   ```sh
   cp .env.example .env
   ```

   Populate the `.env` file with relevant values. You'll need a MongoDB Atlas connection URI and an OpenAI API key.

3. Install dependencies

   ```sh
   npm install
   ```

4. Run the ingestion script

   ```sh
   npm run ingest:all

5. Start the development server

   ```sh
   npm run dev
   ```