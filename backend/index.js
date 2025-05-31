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
  energy: 50, // 0 = hungry, 100 = full
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

// Hidden skills unlocked through chat
const HIDDEN_SKILLS = [
  { skill: '🎵 Sing', keywords: ['sing', 'song', 'music', 'melody'] },
  { skill: '🕺 Moonwalk', keywords: ['moon', 'moonwalk', 'michael', 'jackson'] },
  { skill: '🎭 Drama Queen', keywords: ['drama', 'theater', 'acting', 'shakespeare'] },
  { skill: '🧠 Genius Mode', keywords: ['einstein', 'smart', 'genius', 'brilliant', 'clever'] },
  { skill: '🦸 Superhero', keywords: ['superhero', 'superman', 'batman', 'marvel', 'hero'] },
  { skill: '🎨 Artist', keywords: ['paint', 'art', 'artist', 'picasso', 'draw'] },
  { skill: '👑 Royal Bow', keywords: ['king', 'queen', 'royal', 'majesty', 'crown'] },
  { skill: '🚀 Space Walk', keywords: ['space', 'astronaut', 'rocket', 'mars', 'moon landing'] },
  { skill: '🎪 Circus Trick', keywords: ['circus', 'juggle', 'acrobat', 'trapeze'] },
  { skill: '🧙 Magic Trick', keywords: ['magic', 'wizard', 'spell', 'abracadabra', 'hocus pocus'] },
  { skill: '💖 Heart Melter', keywords: ['cute', 'adorable', 'sweet', 'precious'] },
  { skill: '🤖 Robot Mode', keywords: ['robot', 'beep', 'boop', 'binary', 'compute'] },
  { skill: '🏴‍☠️ Pirate Arrr', keywords: ['pirate', 'arrr', 'treasure', 'ahoy', 'matey'] },
  { skill: '🥷 Ninja Stealth', keywords: ['ninja', 'stealth', 'shadow', 'katana'] },
  { skill: '🎯 Sniper Focus', keywords: ['focus', 'concentrate', 'precision', 'sniper'] }
];

// Helper to calculate age in days
function getPuppyAge() {
  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  return ((now - puppy.birthTime) / msPerDay).toFixed(1); // 1 decimal place
}

// Helper to update energy based on time passed
function updateEnergy() {
  const now = Date.now();
  const msPerEnergyLoss = 1000 * 60 * 2; // 1 energy lost every 2 minutes
  const elapsed = now - puppy.lastUpdateTime;
  const energyLoss = Math.floor(elapsed / msPerEnergyLoss);
  if (energyLoss > 0) {
    puppy.energy = Math.max(0, puppy.energy - energyLoss); // Energy decreases over time
    puppy.lastUpdateTime += energyLoss * msPerEnergyLoss;
  }
  // If energy reaches 0, puppy dies (starving)
  if (puppy.energy <= 0) {
    puppy.dead = true;
  }
}

// Helper to update level based on skills
function updateLevel() {
  puppy.level = 1 + Math.floor(puppy.skills.length / 5);
}

// Helper to check for hidden skills in chat message
function checkForHiddenSkills(message) {
  if (!message) return null;
  
  const lowerMessage = message.toLowerCase();
  const newSkills = [];
  
  for (const hiddenSkill of HIDDEN_SKILLS) {
    // Check if skill is already learned
    if (puppy.skills.includes(hiddenSkill.skill)) continue;
    
    // Check if any keyword matches
    const hasKeyword = hiddenSkill.keywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    if (hasKeyword) {
      puppy.skills.push(hiddenSkill.skill);
      newSkills.push(hiddenSkill.skill);
    }
  }
  
  return newSkills.length > 0 ? newSkills : null;
}

// Endpoint to get puppy state
app.get('/api/puppy', (req, res) => {
  updateEnergy();
  updateLevel();
  res.json({ ...puppy, age: getPuppyAge() });
});

// Endpoint to interact with puppy (feed, play, train, talk)
app.post('/api/puppy/action', (req, res) => {
  const { action, message } = req.body;
  updateEnergy();
  
  if (puppy.dead && action !== 'feed') {
    // Only allow feeding if dead
    return res.json({ 
      ...puppy, 
      age: getPuppyAge(), 
      message: 'Your puppy is too weak to do anything. Try feeding it!',
      actionBlocked: true 
    });
  }
  
  // Check action limitations based on energy level
  if (action === 'train') {
    if (puppy.energy <= 20) {
      return res.json({ 
        ...puppy, 
        age: getPuppyAge(), 
        message: 'Your puppy is too tired to focus on training! Feed it first. 🍖',
        actionBlocked: true 
      });
    }
    const availableTricks = DOG_TRICKS.filter(trick => !puppy.skills.includes(trick));
    if (availableTricks.length > 0) {
      const trick = availableTricks[Math.floor(Math.random() * availableTricks.length)];
      puppy.skills.push(trick);
      // Training uses energy
      puppy.energy = Math.max(0, puppy.energy - 15);
    } else {
      return res.json({ 
        ...puppy, 
        age: getPuppyAge(), 
        message: 'Your puppy has learned all the basic tricks! Try chatting to unlock hidden skills! 💬',
        actionBlocked: false 
      });
    }
  }
  
  if (action === 'play') {
    if (puppy.energy <= 10) {
      return res.json({ 
        ...puppy, 
        age: getPuppyAge(), 
        message: 'Your puppy is too tired to play! Feed it first. 🍖',
        actionBlocked: true 
      });
    }
    puppy.happiness = Math.min(100, puppy.happiness + 10);
    // Playing uses a bit of energy
    puppy.energy = Math.max(0, puppy.energy - 5);
  }
  
  if (action === 'feed') {
    puppy.energy = Math.min(100, puppy.energy + 25); // Increase energy (make less hungry)
    if (puppy.energy > 0) puppy.dead = false; // Revive if has energy
  }
  
  if (action === 'talk') {
    puppy.happiness = Math.min(100, puppy.happiness + 5);
    let reply = "Woof! I love talking to you! 🐾";
    let newHiddenSkills = null;
    
    if (message) {
      // Check for hidden skills first
      newHiddenSkills = checkForHiddenSkills(message);
      
      // Special responses for hidden skills
      if (newHiddenSkills && newHiddenSkills.length > 0) {
        const skillName = newHiddenSkills[0].replace(/^[^\s]+ /, ''); // Remove emoji
        reply = `🎉 WOW! I just learned "${newHiddenSkills[0]}"! You're amazing! 🌟`;
      }
      // Regular chat responses
      else if (message.toLowerCase().includes('hello')) reply = "Woof woof! Hello! 🐶";
      else if (message.toLowerCase().includes('hungry')) reply = "I could use a snack! 🍖";
      else if (message.toLowerCase().includes('play')) reply = "Let's play fetch! 🎾";
      else if (message.toLowerCase().includes('good')) reply = "You're a good human! 🥰";
      else if (message.toLowerCase().includes('love')) reply = "I love you too! ❤️";
      else if (message.toLowerCase().includes('trick')) reply = "Want to see my tricks? Try training me more! 🎪";
      else if (message.toLowerCase().includes('secret')) reply = "Psst... try talking about different topics to unlock my hidden talents! 🤫";
    }
    
    updateLevel();
    puppy.lastUpdateTime = Date.now();
    return res.json({ 
      puppy: { ...puppy, age: getPuppyAge() }, 
      reply,
      newSkills: newHiddenSkills // Send info about newly unlocked skills
    });
  }
  
  updateLevel();
  puppy.lastUpdateTime = Date.now();
  res.json({ ...puppy, age: getPuppyAge(), actionBlocked: false });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
}); 