# AI Battleship Game

A fully functional AI Battleship game built with vanilla HTML, CSS, and JavaScript. Play against an intelligent AI opponent in this classic naval strategy game!

## 🎮 Features

- **Interactive Ship Placement**: Manually place ships with live preview or use random placement
- **Intelligent AI Opponent**: AI uses smart targeting strategies to hunt and sink your ships
- **Turn-Based Combat**: Classic battleship gameplay with hit/miss/sunk detection
- **Responsive Design**: Mobile-friendly interface with beautiful ocean-themed styling
- **Game Statistics**: Track shots fired, hits, and ships sunk
- **Visual Feedback**: Clear indicators for hits (💥), misses (💧), and sunk ships (💀)

## 🚀 How to Play

1. **Ship Placement Phase**:
   - Click on your grid to place ships manually
   - Use "Rotate Ship" to change orientation
   - Or click "Random Placement" for automatic setup
   - Ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)

2. **Battle Phase**:
   - Click on enemy waters to fire
   - Red squares (💥) indicate hits
   - Gray squares (💧) indicate misses
   - Sink all enemy ships to win!

## 🌐 GitHub Pages Deployment

To enable GitHub Pages and get a live URL:

1. **Merge the PR**: Go to https://github.com/tawil4/ai-battleship/pull/1 and merge it
2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Set Source to "Deploy from a branch"
   - Select "main" branch and "/ (root)" folder
   - Click Save
3. **Access the game**: Your game will be available at `https://tawil4.github.io/ai-battleship/`

## 🛠️ Technical Details

- **Pure Frontend**: No server required - perfect for GitHub Pages
- **Responsive Design**: Works on desktop and mobile devices
- **Smart AI**: Uses adjacent cell targeting after hits for realistic gameplay
- **Clean Code**: Well-structured JavaScript with clear separation of concerns

## 🎯 Game Rules

- Each player has a 10x10 grid
- Ships cannot overlap or touch diagonally
- Take turns firing at opponent's grid
- First to sink all enemy ships wins
- AI plays with intelligent targeting strategy

Enjoy the battle! ⚓
