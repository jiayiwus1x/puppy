# 🐶 Virtual Puppy Game

A delightful virtual pet game where you can raise, train, and care for AI-powered puppies. Features multiple dog breeds with unique abilities, community sharing, hidden skills, and real-time progression.

## ✨ Features

### Core Gameplay
- **10 Dog Breeds** with unique specialties (Labrador, Poodle, Border Collie, etc.)
- **Progressive Leveling** based on skills learned (1 + floor(skills_count / 5))
- **Visual Evolution** - puppies change appearance at levels 2, 4, and 6
- **Real-time Aging** - 5 minutes = 1 day in game time
- **Energy & Happiness System** - affects what actions puppies can perform

### Game Modes
- **Personal Mode** - Train your own puppy with full control
- **Community Mode** - Browse, care for, and adopt shared puppies

### Hidden Skills System
- **15 Hidden Skills** unlocked through chat keywords
- Includes: 🎵 Sing, 🕺 Moonwalk, 🦸 Superhero, 🧙 Magic Trick, and more
- Breed bonuses affect discovery rates

### Community Features
- **Browse Puppies** - See all community puppies with stats
- **Leaderboards** - Highest level, most skilled, oldest, most popular
- **Activity Feed** - Real-time community interactions
- **Statistics Dashboard** - Total puppies, breed distribution
- **Adoption System** - Take ownership of community puppies

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x
- npm or yarn

### Installation

#### Frontend
```bash
cd frontend
npm install
npm start
```
The frontend will run on `http://localhost:3000`

#### Backend
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:8080`

### Environment Setup
Create a `.env` file in the frontend directory:
```
REACT_APP_API_URL=http://localhost:8080
```

For production deployment, set:
```
REACT_APP_API_URL=https://your-heroku-app.herokuapp.com
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

### Backend Tests
```bash
cd backend
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Test Coverage
The tests cover:
- **Frontend**: Component rendering, user interactions, API calls, state management
- **Backend**: All API endpoints, game mechanics, community features, error handling

## 🎮 Game Mechanics

### Puppy Actions
- **Feed** 🍖 - Increases energy (10-25 points based on hunger level)
- **Play** 🎾 - Increases happiness (10+ points, breed bonuses apply)
- **Train** 🧠 - Learns new skills (requires energy > 20, happiness > 20)
- **Talk** 💬 - Chat to discover hidden skills and increase happiness

### Breed Specialties
- **Happiness Specialists**: Welsh Corgi, Chihuahua, Labrador, Samoyed
- **Energy Efficient**: Siberian Husky, Shih Tzu, Labrador, Samoyed  
- **Training Experts**: Border Collie, Shiba Inu
- **Hidden Skill Finders**: Beagle
- **Fast Learners**: Poodle

### Level Progression
- **Level 1**: 0-4 skills (🐶)
- **Level 2**: 5-9 skills (🦮) 
- **Level 3+**: Every 5 skills (🐕‍🦺 at level 4+)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19, CSS3, Testing Library
- **Backend**: Node.js, Express, CORS
- **Deployment**: Heroku (backend), GitHub Pages (frontend)
- **Testing**: Jest, Supertest

### API Endpoints
- `GET /api/breeds` - Available dog breeds
- `GET /api/puppy` - Get puppy data
- `POST /api/puppy/create` - Create new puppy
- `POST /api/action` - Perform puppy actions
- `POST /api/puppy/chat` - Chat with puppy
- `GET /api/community` - Browse community puppies
- `GET /api/community/leaderboards` - Get leaderboards
- `GET /api/community/activity` - Get activity feed
- `GET /api/community/stats` - Get community stats
- `POST /api/puppy/share` - Share puppy to community
- `POST /api/puppy/adopt` - Adopt community puppy

## 🚢 Deployment

### Backend (Heroku)
```bash
cd backend
git init
heroku create your-app-name
git add .
git commit -m "Initial deployment"
git push heroku main
```

### Frontend (GitHub Pages)
```bash
cd frontend
npm run build
npm run deploy
```

## 🎯 Game Tips

1. **Feed regularly** - Puppies lose energy over time
2. **Keep happiness high** - Happy puppies learn skills faster
3. **Try different chat keywords** - Unlock hidden skills through conversation
4. **Breed selection matters** - Each breed has unique advantages
5. **Community participation** - Share your puppy when away, adopt others

## 🐛 Troubleshooting

### Common Issues
- **Loading puppy data...** - Check API_URL environment variable
- **Action buttons disabled** - Puppy may lack energy or happiness
- **Hidden skills not unlocking** - Try specific keywords like "sing", "magic", "superhero"

### Browser Console
Check browser console for API errors and connection issues.

## 📝 Development

### Code Structure
```
├── frontend/
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   ├── App.css         # Styles
│   │   └── App.test.js     # Frontend tests
└── backend/
    ├── index.js            # Express server
    ├── test.js             # Backend tests
    ├── package.json        # Dependencies
    └── jest.config.js      # Test configuration
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

---

Made with ❤️ for virtual puppy lovers everywhere! 🐶 