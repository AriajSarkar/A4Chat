# Docker Commands for A4Chat

## 🚀 Initial Setup
```bash
# Build base image first
docker-compose build base
```

## 🏗️ Build Process
```bash
# Clean build with no cache
docker-compose build --no-cache build

# Regular build with cache
docker-compose build build

# Run build process
docker-compose up build
```

## 🖥️ Run Application

### Linux
```bash
# Enable X11 forwarding
xhost +local:docker

# Run the application
docker-compose up run-linux
```

### macOS
```bash
# Build for macOS
docker-compose build build

# Run the built app
open ./dist/mac/A4Chat.app
```

## ✅ Verification
```bash
# Check build artifacts
docker-compose up verify
```

## 🗑️ Cache Management
```bash
# Clear all caches
docker-compose down -v
docker builder prune

# View cache usage
docker system df -v
```

## 🔧 Troubleshooting

### Logs
```bash
# View build logs
docker-compose logs build

# View runtime logs
docker-compose logs run-linux
```

### Debug Access
```bash
# Get interactive shell in build container
docker-compose run --rm build bash
```

### Complete Reset
```bash
# Clean everything and rebuild
docker-compose down -v
docker system prune -af
docker-compose build --no-cache base
docker-compose build --no-cache build
```

## 📝 Notes
- Always run commands from the Docker directory
- Use clean builds when changing dependencies
- Check logs when troubleshooting build issues