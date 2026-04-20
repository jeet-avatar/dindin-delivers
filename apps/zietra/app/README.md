# CRM Email Marketing Platform - Frontend

Modern React + TypeScript frontend for the CRM Email Marketing Automation Platform with centralized UI customization system.

## 🚀 Features

- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Complete CRM Interface**: Contacts, Companies, Deals, Activities management
- **Campaign Builder**: Create and manage email campaigns
- **Email Composer**: Rich text email editor
- **Subscription Pricing**: 4-tier pricing page with Stripe checkout
- **Dashboard**: Analytics and insights
- **Authentication**: JWT-based auth with Google OAuth
- **Real-time Updates**: WebSocket support for live data

## 📦 Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **State**: React Context API

## 🛠️ Quick Start (Development)

```bash
# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:3000" > .env

# Start development server
npm run dev
```

Frontend runs on http://localhost:5173

## 🌐 Environment Variables

Create `.env` file:

```bash
# Development
VITE_API_URL=http://localhost:3000

# Production
VITE_API_URL=https://your-backend-api.railway.app
```

## 🏗️ Build for Production

```bash
# Build
npm run build

# Preview build
npm run preview
```

Build output goes to `dist/` directory.

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Set `VITE_API_URL` environment variable
4. Deploy

### Other Options

- **Netlify**: Same process as Vercel
- **AWS S3 + CloudFront**: Upload `dist/` folder
- **Railway**: Connect repo and deploy

## 📄 Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
│   ├── Contacts/
│   ├── Companies/
│   ├── Deals/
│   ├── Campaigns/
│   └── Pricing/
├── contexts/       # React Context providers
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
└── App.tsx         # Main app component
```

## 🎨 Styling

This project uses Tailwind CSS for styling. Configuration in `tailwind.config.js`.

## 🔧 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## 📝 License

MIT

## 🎨 UI Customization

The application features a centralized UI customization system:

- **`src/config/theme.ts`** - Colors, typography, spacing, shadows, transitions
- **`src/config/ui.ts`** - Component configs, labels, messages, settings
- **`src/index.css`** - Complete utility classes and button styles

See documentation in `docs/` for detailed customization guides.

## 📦 Related Repositories

- **Backend API:** https://github.com/jeet-avatar/crm-email-marketing-platform

## 🤖 Built By

This project was built with [Claude Code](https://claude.com/claude-code)

---

**Status**: Production Ready ✅
**Framework**: React + Vite ✅
**Deployment**: Vercel/Netlify Compatible ✅
