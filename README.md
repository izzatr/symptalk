# Symptalk 🤖💬

Symptalk is an intelligent, AI-powered doctor appointment assistant designed to make accessing healthcare as simple as having a conversation. It provides a seamless interface for patients to book appointments using either text or voice, 24/7.

## ✨ Vision

To create a world where accessing healthcare is frictionless. Symptalk serves as an empathetic and universally accessible first point of contact for every patient's healthcare journey, handling administrative tasks so that healthcare professionals can focus on providing care.

## 🤖 Core Technologies

This project leverages a modern, real-time technology stack:

-   **Framework**: [Next.js](https://nextjs.org/)
-   **UI**: [React](https://reactjs.org/) & [Tailwind CSS](https://tailwindcss.com/)
-   **Backend Server**: A custom [Node.js](https://nodejs.org/) server using `server.js`.
-   **Real-time Communication**: [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) (`ws` library) for both voice streaming and chat messages.
-   **Speech-to-Text**: [fal.ai](https://fal.ai/) for real-time voice transcription.
-   **Conversational AI Logic**: Handled by an external [n8n.io](https://n8n.io/) workflow.
-   **Deployment**: Containerized using [Docker](https://www.docker.com/).

## 🚀 Getting Started

To run this project locally, you will need Node.js and a package manager (npm, yarn, or pnpm) installed.

### 1. Installation

First, clone the repository and install the project dependencies:

```bash
git clone <your-repository-url>
cd symptalk
npm install
```

### 2. Environment Variables

The application requires an n8n webhook URL to function correctly. Create a `.env.local` file in the root of the project:

```bash
touch .env.local
```

Then, add the following variable to the file, replacing the placeholder with your actual n8n webhook URL:

```env
# .env.local
FAL_KEY={insert your own key here}
N8N_WEBHOOK_URL=https://your-n8n-webhook-url.com/webhook/chat-room
```

### 3. Running the Development Server

For local development, you should run the custom Node.js server, which handles both the Next.js application and the WebSocket connections.

```bash
npm run dev:local
```

This will start the server using `nodemon` for automatic restarts on file changes. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🚢 Deployment

This application is designed to be deployed as a stateful container using Docker.

### 1. Build the Docker Image

From the root of the project, run the following command to build the production-ready Docker image:

```bash
docker build -t symptalk .
```

### 2. Run the Docker Container

Once the image is built, you can run it as a container. Make sure to pass your environment variables to the container. The simplest way is to point it to your `.env.local` file.

```bash
docker run -p 3000:3000 -d --env-file .env.local --name symptalk-app symptalk
```

Your application will now be running at `http://localhost:3000` (or the IP address of your server) in a detached (`-d`) production environment.
