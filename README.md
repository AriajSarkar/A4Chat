# 🚀 A4Chat

> 🤖 An elegant chat interface for Ollama, built with modern web technologies.

A sleek desktop application crafted with Electron, React, TypeScript, and Tailwind CSS that provides a seamless interface for interacting with Ollama language models.

Using [electron-react-typescript-tailwind-starter](https://github.com/rostislavjadavan/electron-react-typescript-tailwind-starter) starter template by [Rostislav Jadavan](https://github.com/rostislavjadavan).

## ✨ Features

- 🎨 **Modern UI** - Clean interface with dark/light theme support
- 💬 **Real-time Chat** - Streaming responses with minimal latency
- 🔄 **Model Switching** - Easy switching between different models
- 📝 **Rich Text** - Markdown support with syntax highlighting
- 🌐 **Cross Platform** - Windows and Linux (macOS coming soon)
- 🎯 **Responsive** - Adapts perfectly with collapsible sidebar

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm
- Ollama installed and running ([Install Ollama](https://ollama.ai))

### Installation

Clone the repository:
```bash
git clone https://github.com/AriajSarkar/A4Chat.git
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm start
```

## Building for Production

Build packages for your platform:
```bash
npm run make
```

> Note: macOS support is currently in development and will be available in a future release.

## 🛠️ Development

### 📦 Available Scripts

```bash
npm start      # Start development server
npm run make   # Create platform installers
npm run lint   # Run code linting
```

### 🐳 Docker Support

For Docker build and run commands, see [`Docker/Commands.md`](Docker/Commands.md)

## 📝 Configuration

The application connects to Ollama at `http://localhost:11434` by default. To modify this:

Create a `.env` file:
```env
OLLAMA_API_URL=http://localhost:11434/api
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [electron-react-typescript-tailwind-starter](https://github.com/rostislavjadavan/electron-react-typescript-tailwind-starter) - Base template
- [Ollama](https://ollama.ai) - Local language model runtime
- [TailwindCSS](https://tailwindcss.com) - Utility-first CSS framework
- [React](https://reactjs.org) - UI library
- [Electron](https://www.electronjs.org) - Desktop application framework

