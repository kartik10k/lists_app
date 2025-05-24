# Voice Lists App

A voice-powered list management web application that allows users to create and manage different types of lists using voice commands or manual input.

## Features

- Voice input support for adding items to lists
- Multiple list types with custom names
- List aliases for better voice recognition
- Offline functionality with local storage
- Modern, responsive UI
- Easy list item management (add, edit, delete, mark complete)

## Live Demo

Visit the live demo at: [https://yourusername.github.io/voice-lists](https://yourusername.github.io/voice-lists)

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/voice-lists.git
cd voice-lists
```

2. Open `index.html` in your browser (Chrome recommended for voice recognition)

## Deployment

### GitHub Pages

1. Create a new repository on GitHub
2. Push your code to the repository:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/voice-lists.git
git push -u origin main
```

3. Go to repository settings
4. Scroll down to "GitHub Pages" section
5. Select "main" branch as source
6. Your app will be available at `https://yourusername.github.io/voice-lists`

### Alternative Hosting Options

1. **Netlify**:
   - Create a Netlify account
   - Drag and drop your folder to Netlify
   - Your app will be available at `https://your-app-name.netlify.app`

2. **Vercel**:
   - Create a Vercel account
   - Connect your GitHub repository
   - Your app will be available at `https://your-app-name.vercel.app`

## Usage

1. **Voice Input**:
   - Click the microphone button
   - Say "Add [item] to [list type]"
   - Example: "Add milk to groceries"

2. **Manual Input**:
   - Click the + button
   - Type your item
   - Press Enter or click Add

3. **Managing Items**:
   - Click an item to toggle completion
   - Click the delete icon to remove an item
   - Switch between lists using the tabs

4. **Creating Lists**:
   - Use voice command: "Create new list [name]"
   - Add alternative names for better voice recognition

## Browser Support

The app works best in modern browsers that support the Web Speech API (Chrome, Edge, Safari).

## License

MIT 