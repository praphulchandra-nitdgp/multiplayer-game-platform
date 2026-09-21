# Multiplayer Game Platform

A modern, real-time multiplayer gaming platform built with **React 19**, **TanStack Start & Router**, **Tailwind CSS v4**, and **Supabase**. Create game rooms, invite players, play real-time Tic-Tac-Toe, chat live with participants, and track global leaderboard rankings.

---

## 🚀 Features

- 🔐 **User Authentication**: Secure signup, login, and player profile management.
- 🎮 **Game Lobby & Room Management**: Create public or private game rooms, customize room settings, and join ongoing matches.
- 🕹️ **Real-Time Multiplayer Gameplay**: Synchronized Tic-Tac-Toe gameplay powered by real-time state updates.
- 💬 **In-Room Live Chat**: Real-time interactive chat system within game rooms.
- 🏆 **Global Leaderboard**: Track player rankings, wins, losses, and stats.
- 🎨 **Modern Dark UI**: Aesthetic glassmorphism design with responsive Tailwind CSS styling and accessible Radix UI primitives.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/), [TanStack Start](https://tanstack.com/start/latest) & [TanStack Router](https://tanstack.com/router/latest)
- **State & Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React Icons](https://lucide.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime subscriptions, Auth)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)

---

## 📦 Prerequisites

Before getting started, ensure you have the following installed on your machine:

- **Node.js**: `v18.0.0` or higher (v20+ recommended)
- **npm**: `v9.0.0` or higher (or `bun` / `pnpm` / `yarn`)

---

## ⚙️ Quick Start & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/praphulchandra-nitdgp/multiplayer-game-platform.git
cd multiplayer-game-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root directory and set your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id

SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_PROJECT_ID=your_supabase_project_id
```

### 4. Run the Development Server

Start the Vite dev server locally:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000` (or the port specified in terminal output).

---

## 📜 Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the development server with Hot Module Replacement (HMR) |
| `npm run build` | Builds the app for production |
| `npm run preview` | Locally preview the built production application |
| `npm run lint` | Runs ESLint to check for code quality and errors |
| `npm run format` | Formats codebase using Prettier |

---

## 📁 Directory Structure

```
multiplayer-game-platform/
├── public/                # Static assets
├── src/
│   ├── components/        # Reusable UI components & game boards
│   │   ├── games/         # Multiplayer game implementations (e.g. Tic-Tac-Toe)
│   │   ├── ui/            # Radix UI styled primitives
│   │   ├── room-chat.tsx  # In-game chat component
│   │   └── site-header.tsx# Application navigation header
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # Supabase client & integration setup
│   ├── lib/               # Utility functions and helpers
│   ├── routes/            # TanStack Start file-based routes
│   │   ├── _authenticated/# Protected routes (lobby, profile, rooms, leaderboard)
│   │   ├── auth.tsx       # Auth page (login/signup)
│   │   └── index.tsx      # Landing page
│   ├── router.tsx         # TanStack Router configuration
│   └── styles.css         # Global styles & Tailwind CSS imports
├── supabase/              # Supabase config & migration files
├── package.json           # Dependencies and script definitions
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).