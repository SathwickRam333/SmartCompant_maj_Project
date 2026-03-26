# 🏛️ Smart Grievance Redressal System — Government of Telangana

<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Telangana_State_Emblem.svg/200px-Telangana_State_Emblem.svg.png" alt="Telangana Emblem" width="120" />
  
  **AI-Powered Citizen Grievance Portal**
  
  Real-time complaint tracking • AI-based routing • Public transparency dashboard
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-11-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Contributing](#-contributing)
- [Team](#-team)
- [License](#-license)

---

## 🌟 Overview

The **Smart Grievance Redressal System** is a comprehensive, production-grade web application designed for the Government of Telangana to efficiently manage and resolve citizen complaints. The system leverages AI for intelligent complaint classification, real-time tracking, and transparent public dashboards.

### Key Highlights

- 🤖 **AI-Powered Classification** - Automatic department assignment using GPT-3.5
- 📍 **GPS-Enabled Complaints** - Location-aware complaint submission
- ⏱️ **SLA Monitoring** - Automated escalation and deadline tracking
- 📊 **Public Dashboard** - Real-time transparency with charts and maps
- 🔔 **Smart Notifications** - Email alerts for status updates
- 🗣️ **Multilingual Support** - English and Telugu
- 💬 **AI Chatbot (Clod.AI)** - 24/7 citizen assistance

---

## ✨ Features

### For Citizens

| Feature | Description |
|---------|-------------|
| 📝 **Easy Complaint Filing** | Submit complaints via text, voice, or image |
| 🔍 **Real-time Tracking** | Track complaint status with unique tracking ID |
| 📱 **Mobile Responsive** | Seamless experience on all devices |
| 🤖 **AI Chatbot** | Get instant help with Clod.AI assistant |
| 📧 **Email Notifications** | Receive updates at every step |
| ⭐ **Feedback System** | Rate and review resolutions |

### For Officers

| Feature | Description |
|---------|-------------|
| 📋 **Dashboard** | View assigned complaints with priority sorting |
| ⏰ **SLA Timers** | Visual countdown for resolution deadlines |
| 📷 **Before/After Images** | Document complaint resolution |
| 🔄 **Status Updates** | Easy one-click status transitions |
| 📊 **Performance Metrics** | Track personal resolution statistics |

### For Administrators

| Feature | Description |
|---------|-------------|
| 📈 **Analytics Dashboard** | Comprehensive charts and statistics |
| 👥 **User Management** | Add/manage officers and departments |
| ⚙️ **SLA Configuration** | Customize deadline rules |
| 📥 **Data Export** | Export reports to CSV |
| 🗺️ **Heatmap View** | Visualize complaint hotspots |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: ShadCN UI / Radix UI
- **Charts**: Recharts
- **Maps**: Leaflet.js + OpenStreetMap
- **Forms**: React Hook Form + Zod

### Backend
- **Platform**: Firebase
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage
- **Functions**: Cloud Functions for Firebase

### AI & Communications
- **AI Classification**: OpenAI GPT-3.5 Turbo
- **Email Service**: SendGrid
- **Speech Recognition**: Web Speech API

---

## 📁 Project Structure

```
Smart-Grievance/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page
│   ├── login/                    # Authentication pages
│   ├── register/
│   ├── forgot-password/
│   ├── complaint/
│   │   └── new/                  # File new complaint
│   ├── track/                    # Track complaint status
│   ├── dashboard/                # Public transparency dashboard
│   ├── chatbot/                  # Clod.AI chatbot
│   ├── officer/                  # Officer dashboard
│   └── admin/                    # Admin panel
├── components/
│   ├── ui/                       # ShadCN UI components
│   ├── layout/                   # Header, Footer
│   └── MapView.tsx               # Leaflet map component
├── services/                     # API service layers
│   ├── auth.service.ts
│   ├── complaints.service.ts
│   ├── ai.service.ts
│   ├── email.service.ts
│   └── stats.service.ts
├── contexts/                     # React contexts
│   └── AuthContext.tsx
├── lib/                          # Utilities and types
│   ├── types.ts
│   └── utils.ts
├── firebase/                     # Firebase configuration
│   └── config.ts
├── functions/                    # Cloud Functions
│   └── src/
│       └── index.ts
├── firestore.rules              # Security rules
├── firestore.indexes.json       # Database indexes
└── firebase.json                # Firebase config
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- OpenAI API key
- SendGrid API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/smart-grievance.git
   cd smart-grievance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

5. **Initialize Firebase**
   ```bash
   firebase init
   # Select Firestore, Functions, Hosting
   ```

6. **Install Cloud Functions dependencies**
   ```bash
   cd functions
   npm install
   cd ..
   ```

7. **Run development server**
   ```bash
   npm run dev
   ```

8. **Open browser**
   Navigate to `http://localhost:3000`

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# OpenAI (for AI classification)
OPENAI_API_KEY=sk-your_openai_api_key

# SendGrid (for email notifications)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@telangana.gov.in
```

For Cloud Functions, set config:
```bash
firebase functions:config:set openai.api_key="YOUR_KEY" sendgrid.api_key="YOUR_KEY"
```

---

## 📦 Deployment

### Deploy to Firebase

1. **Build the Next.js application**
   ```bash
   npm run build
   ```

2. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Deploy Cloud Functions**
   ```bash
   cd functions
   npm run build
   cd ..
   firebase deploy --only functions
   ```

4. **Deploy Hosting (if using Firebase Hosting)**
   ```bash
   firebase deploy --only hosting
   ```

### Deploy to Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy with one click

---

## 📡 API Documentation

### Cloud Functions Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/getDashboardStats` | GET | Fetch public dashboard statistics |
| `/chatbot` | POST | AI chatbot conversation |

### Firestore Collections

| Collection | Description |
|------------|-------------|
| `users` | User profiles and roles |
| `complaints` | Complaint records |
| `notifications` | User notifications |
| `statistics` | Aggregated statistics |
| `ai_classifications` | AI classification logs |

---

## 🔒 Security

### Authentication
- Firebase Authentication with email/password
- Role-based access control (Citizen, Officer, Admin)
- Protected routes with AuthContext

### Database Security
- Firestore security rules enforce role-based access
- Users can only read/write their own data
- Officers can access assigned complaints
- Admins have full access

### Data Protection
- HTTPS encryption in transit
- Firebase security for data at rest
- No sensitive data logged

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👥 Team

**Academic Project by VNRVJIET Students**

| Role | Name |
|------|------|
| Project Lead | Student Name |
| Backend Developer | Student Name |
| Frontend Developer | Student Name |
| AI/ML Engineer | Student Name |

**Guided by**: Faculty Name, VNRVJIET

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Government of Telangana for inspiration
- VNRVJIET for academic support
- OpenAI for AI capabilities
- Firebase for backend infrastructure

---

<div align="center">
  <p>Made with ❤️ for the Citizens of Telangana</p>
  <p>
    <a href="https://nextjs.org">Next.js</a> •
    <a href="https://firebase.google.com">Firebase</a> •
    <a href="https://tailwindcss.com">Tailwind CSS</a>
  </p>
</div>
