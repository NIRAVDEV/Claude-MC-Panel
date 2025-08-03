// README.md
# Minecraft Hosting Platform

A modern, credit-based Minecraft server hosting platform built with Next.js 14, featuring free hosting through an ad-supported credit system.

## Features

### 🎮 Server Management
- **Multiple Server Software**: Support for Vanilla, Paper, Spigot, Forge, and Fabric
- **Real-time Control**: Start, stop, restart servers with live status updates
- **Resource Configuration**: Flexible RAM and storage allocation
- **Server Console**: Built-in console for command execution and log viewing
- **File Manager**: Web-based file management interface

### 💰 Credit System
- **Earn Credits**: Watch ads, click links, daily bonuses, and referral rewards
- **Purchase Credits**: Optional paid credit packages for instant access
- **Transparent Pricing**: Clear credit costs for RAM and storage
- **Transaction History**: Complete record of all credit transactions

### 👥 User Management
- **Authentication**: Secure login with NextAuth.js
- **Role-based Access**: User and Admin roles with appropriate permissions
- **Profile Management**: User profile and account settings

### 🛠️ Admin Panel
- **User Management**: View and manage all platform users
- **Node Management**: Configure and monitor hosting nodes
- **System Monitoring**: Platform statistics and health metrics
- **Credit Management**: Control credit earning rates and pricing

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Lucide React** for icons

### Backend
- **Prisma ORM** with PostgreSQL
- **NextAuth.js** for authentication
- **Docker API** for container management
- **RESTful APIs** with Next.js API routes

### Infrastructure
- **Docker** containers for Minecraft servers
- **PostgreSQL** database
- **Node.js** hosting nodes
- **Responsive design** for all devices

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Docker (for server hosting)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/NIRAVDEV/Claude-MC-Panel.git
cd minecraft-hosting
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
npm run db:push
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to `http://localhost:3000`
