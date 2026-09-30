# Indian Railways Frontend (IRCTC Train Search & Live Tracking)

A modern, high-performance web application for Indian Railways passengers featuring live train search, real-time running status tracking (Spot Your Train), and PNR status checking with instant CAPTCHA verification.

## 🚆 Features

- **Live Train Search:** Search between 8,000+ Indian Railway stations with intelligent autocomplete (station codes & names), real-time seat availability across all classes (1A, 2A, 3A, 3E, SL, CC, EC, 2S), and quota filtering (General, Tatkal, Ladies, Sr. Citizen).
- **Spot Your Train (Live Running Status):** Track live train location, delay status (on time / delayed), current station, platform numbers, and interactive station timeline with coach position guide.
- **PNR Status Tracking:** Real-time PNR query with instant session generation, interactive CAPTCHA verification, booking vs. current status, chart preparation indicator, and coach visualizer.
- **Vande Bharat Animations:** Responsive train tracker and animated branding header.
- **CORS-Resilient Proxy Architecture:** Seamless zero-CORS proxying for production and local environments.

## 🛠 Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide Icons
- **Backend API:** FastAPI on Render (`https://irctc-backend-1-ge8x.onrender.com`)
- **State & Context:** React Context API + LocalStorage Caching

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or bun

### Installation

1. Clone repository:
```bash
git clone https://github.com/rockingtushar/irctc_frontend.git
cd irctc_frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure Environment Variables:
Copy `.env.example` to `.env`:
```env
VITE_API_URL=https://irctc-backend-1-ge8x.onrender.com
VITE_API_BASE_URL=https://irctc-backend-1-ge8x.onrender.com
```

4. Start Development Server:
```bash
npm run dev
```

5. Build for Production:
```bash
npm run build
```

## 📄 License

MIT License.
