const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Placeholder puppy state
let puppy = {
  name: 'Puppy',
  birthTime: Date.now(),
  happiness: 50,
  hunger: 50,
  skills: [],
  level: 1,
  lastUpdateTime: Date.now(),
  dead: false,
};

const DOG_TRICKS = [
  'Sit',
  'Stay',
  'Roll Over',
  'Shake Paw',
  'Play Dead',
  'Fetch',
  'Spin',
  'Speak',
  'High Five',
  'Jump',
  'Dance',
  'Crawl',
  'Back Up',
  'Bow',
  'Wave',
  'Balance Treat',
  'Heel',
  'Find It',
  'Ring Bell',
  'Open Door'
];

// Helper to calculate age in days
function getPuppyAge() {
  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  return ((now - puppy.birthTime) / msPerDay).toFixed(1); // 1 decimal place
}

// Helper to update hunger based on time passed
function updateHunger() {
  const now = Date.now();
  const msPerHunger = 1000 * 60 * 2; // 1 hunger lost every 2 minutes
  const elapsed = now - puppy.lastUpdateTime;
  const hungerLoss = Math.floor(elapsed / msPerHunger);
  if (hungerLoss > 0) {
    puppy.hunger = Math.max(0, puppy.hunger - hungerLoss);
    puppy.lastUpdateTime += hungerLoss * msPerHunger;
  }
  // If hunger is 0, puppy dies
  if (puppy.hunger === 0) {
    puppy.dead = true;
  }
}

// Helper to update level based on skills
function updateLevel() {
  puppy.level = 1 + Math.floor(puppy.skills.length / 5);
}

// Endpoint to get puppy state
app.get('/api/puppy', (req, res) => {
  updateHunger();
  updateLevel();
  res.json({ ...puppy, age: getPuppyAge() });
});

// Endpoint to interact with puppy (feed, play, train, talk)
app.post('/api/puppy/action', (req, res) => {
  const { action, message } = req.body;
  updateHunger();
  if (puppy.dead && action !== 'feed') {
    // Only allow feeding if dead
    return res.json({ ...puppy, age: getPuppyAge(), message: 'Your puppy is too weak to do anything. Try feeding it!' });
  }
  if (action === 'feed') {
    puppy.hunger = Math.min(100, puppy.hunger + 20);
    if (puppy.hunger > 0) puppy.dead = false;
  }
  if (action === 'play') puppy.happiness = Math.min(100, puppy.happiness + 10);
  if (action === 'train') {
    const availableTricks = DOG_TRICKS.filter(trick => !puppy.skills.includes(trick));
    if (availableTricks.length > 0) {
      const trick = availableTricks[Math.floor(Math.random() * availableTricks.length)];
      puppy.skills.push(trick);
    }
  }
  if (action === 'talk') {
    puppy.happiness = Math.min(100, puppy.happiness + 5);
    let reply = "Woof! I love talking to you! 🐾";
    if (message) {
      if (message.toLowerCase().includes('hello')) reply = "Woof woof! Hello! 🐶";
      else if (message.toLowerCase().includes('hungry')) reply = "I could use a snack! 🍖";
      else if (message.toLowerCase().includes('play')) reply = "Let's play fetch! 🎾";
      else if (message.toLowerCase().includes('good')) reply = "You're a good human! 🥰";
      else if (message.toLowerCase().includes('love')) reply = "I love you too! ❤️";
    }
    updateLevel();
    puppy.lastUpdateTime = Date.now();
    return res.json({ puppy: { ...puppy, age: getPuppyAge() }, reply });
  }
  updateLevel();
  puppy.lastUpdateTime = Date.now();
  res.json({ ...puppy, age: getPuppyAge() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
}); 