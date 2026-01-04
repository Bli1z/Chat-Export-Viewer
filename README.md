# 💬 Chat Export Viewer

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web-lightgrey.svg)
![Privacy](https://img.shields.io/badge/privacy-100%25%20Offline-brightgreen.svg)

**A privacy-first, offline chat export viewer built with React + TypeScript.**

View your exported chat history with full media support, search functionality, and POV switching — all processed locally in your browser. No data ever leaves your device.

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🔒 Privacy First
- **100% Offline** — All processing happens in your browser
- **No Server Upload** — Your chats never leave your device
- **IndexedDB Storage** — Data stored locally, cleared when you want

### 📱 Full Chat Experience
- **Message Bubbles** — Authentic chat-style UI with sent/received alignment
- **Media Support** — Images, videos, audio, and documents
- **Date Separators** — Messages grouped by day for easy navigation
- **System Messages** — "User joined", "Encryption enabled", etc.

### 🔍 Powerful Search
- **Full-Text Search** — Find any message instantly
- **Date Range Filter** — Search within specific time periods
- **Result Navigation** — Jump between search matches
- **Highlight Matches** — Search terms highlighted in context

### 👁️ POV Switching
- **View As Anyone** — Switch perspective to any chat participant
- **Smart Default** — Auto-selects the most likely "you" (most messages)
- **Instant Toggle** — Change POV without reloading

### ⚡ Performance Optimized
- **999k+ Messages** — Handles massive chat exports smoothly
- **Virtual Scrolling** — Only renders visible messages (React Virtuoso)
- **Chunked Processing** — Non-blocking import with progress tracking
- **GPU Acceleration** — Smooth scrolling with `will-change: transform`

### 🎨 Modern UI
- **Dark Theme** — Easy on the eyes, WhatsApp-inspired design
- **Responsive Layout** — Works on desktop and mobile
- **Animations** — Smooth transitions and micro-interactions
- **Typewriter Loader** — Cute animated loader during import

---

## 🚀 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/Bli1z/Chat-Export-Viewer.git

# Navigate to project directory
cd Chat-Export-Viewer

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready to deploy to any static host.

---

## 📖 Usage

### Exporting Your Chat

1. Open your chat app
2. Go to chat settings → **Export Chat**
3. Choose **With Media** for full experience
4. Save as `.zip` or `.txt` file

### Importing into Viewer

1. Open Chat Export Viewer
2. Click the **+** button or drag & drop your file
3. Wait for processing (progress bar shows status)
4. Browse your chat history!

### Supported Formats

| Format | Media Support | Notes |
|--------|--------------|-------|
| `.txt` | ❌ Text only | Quick import, no media |
| `.zip` | ✅ Full media | Recommended for complete experience |
| Folder | ✅ Full media | Drag entire export folder |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool |
| **React Virtuoso** | Virtual Scrolling |
| **IndexedDB (idb)** | Local Storage |
| **JSZip** | ZIP Extraction |
| **CSS Variables** | Theming |

---

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ChatView.tsx     # Main chat display
│   ├── MessageBubble.tsx # Individual message
│   ├── MessageList.tsx  # Virtualized list
│   ├── SearchBar.tsx    # Search functionality
│   ├── POVSelector.tsx  # Perspective switcher
│   ├── Sidebar.tsx      # Chat list
│   └── ImportModal.tsx  # File import UI
├── hooks/               # Custom React hooks
│   ├── useChats.ts      # Chat management
│   ├── useMessages.ts   # Message loading
│   └── useImport.ts     # Import logic
├── services/            # Business logic
│   ├── parser.ts        # Chat file parsing
│   ├── storage.ts       # IndexedDB operations
│   ├── mediaMatcher.ts  # Media file matching
│   └── validation.ts    # Input validation
└── types.ts             # TypeScript definitions
```

---

## 🎯 Roadmap

- [ ] Export to PDF
- [ ] Multiple chat tabs
- [ ] Message statistics/analytics
- [ ] Custom themes
- [ ] Telegram/Signal support
- [ ] Desktop app (Electron)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⚠️ Disclaimer

This is an independent tool for viewing chat exports. **Not affiliated with, endorsed, or sponsored by WhatsApp Inc. or Meta Platforms.** WhatsApp™ is a trademark of Meta Platforms, Inc.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for privacy-conscious users**

⭐ Star this repo if you found it useful!

</div>
