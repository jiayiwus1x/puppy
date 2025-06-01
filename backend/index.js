const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// =============================================================================
// CONSTANTS & DATA
// =============================================================================

const DOG_BREEDS = {
  'welshcorgi': {
    name: 'Welsh Corgi',
    description: 'Extra happiness from playing',
    specialties: ['happiness'],
    playHappinessBonus: 5,
    image: 'welshcorgi'
  },
  'bordercollie': {
    name: 'Border Collie', 
    description: '+20% training success rate',
    specialties: ['training'],
    trainingBonus: 0.2,
    image: 'bordercollie'
  },
  'sibhusky': {
    name: 'Siberian Husky',
    description: 'Uses less energy for activities',
    specialties: ['energy'],
    energyEfficiency: 0.3,
    image: 'sibhusky'
  },
  'beagle': {
    name: 'Beagle',
    description: 'Better at finding hidden skills',
    specialties: ['skills'],
    hiddenSkillBonus: 0.5,
    image: 'beagle'
  },
  'poodle': {
    name: 'Poodle',
    description: 'Learns skills faster',
    specialties: ['learning'],
    skillLearningBonus: 0.25,
    image: 'poodle'
  },
  'shihtzu': {
    name: 'Shih Tzu',
    description: 'Slower hunger decay',
    specialties: ['energy'],
    hungerDecayReduction: 0.5,
    image: 'shihtzu'
  },
  'labrador': {
    name: 'Labrador',
    description: 'Balanced and cheerful',
    specialties: ['happiness', 'energy'],
    playHappinessBonus: 3,
    energyEfficiency: 0.15,
    image: 'labrador'
  },
  'shiba': {
    name: 'Shiba Inu',
    description: 'Independent and resilient',
    specialties: ['training'],
    trainingBonus: 0.15,
    hungerDecayReduction: 0.3,
    image: 'shiba'
  },
  'chihuahua': {
    name: 'Chihuahua',
    description: 'High energy but needs more care',
    specialties: ['happiness'],
    playHappinessBonus: 7,
    energyEfficiency: -0.2,
    image: 'chihuahua'
  },
  'samoyed': {
    name: 'Samoyed',
    description: 'Naturally happy and energetic',
    specialties: ['happiness', 'energy'],
    playHappinessBonus: 4,
    hungerDecayReduction: 0.4,
    image: 'samoyed'
  }
};

const DOG_TRICKS = [
  'Sit', 'Stay', 'Roll Over', 'Shake Paw', 'Play Dead', 'Fetch', 'Spin', 'Speak', 
  'High Five', 'Jump', 'Dance', 'Crawl', 'Back Up', 'Bow', 'Wave', 'Balance Treat', 
  'Heel', 'Find It', 'Ring Bell', 'Open Door'
];

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

// =============================================================================
// STORAGE
// =============================================================================

let puppies = new Map(); // userId -> puppy data
let communityPuppies = new Map(); // puppyId -> puppy data  
let sessions = new Map(); // sessionId -> userId

// Initialize with default community puppy
const globalPuppy = {
  id: 'global',
  name: 'Community Puppy',
  breed: 'labrador',
  breedInfo: DOG_BREEDS['labrador'],
  owner: null,
  birthTime: Date.now() - (1000 * 60 * 60), // 1 hour old
  happiness: 50,
  energy: 50,
  skills: [],
  level: 1,
  lastUpdateTime: Date.now(),
  lastActiveTime: Date.now(),
  dead: false,
  inCommunity: true,
  messages: [],
};
communityPuppies.set('global', globalPuppy);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function getRandomSkill(learnedSkills) {
  const availableSkills = DOG_TRICKS.filter(skill => !learnedSkills.includes(skill));
  if (availableSkills.length === 0) return null;
  return availableSkills[Math.floor(Math.random() * availableSkills.length)];
}

function getUserSession(sessionId) {
  if (!sessionId) {
    sessionId = generateId();
    const userId = generateId();
    sessions.set(sessionId, userId);
    return { sessionId, userId, isNew: true };
  }
  
  const userId = sessions.get(sessionId);
  if (!userId) {
    const newUserId = generateId();
    sessions.set(sessionId, newUserId);
    return { sessionId, userId: newUserId, isNew: true };
  }
  
  return { sessionId, userId, isNew: false };
}

function getUserPuppy(userId, puppyName = null) {
  let puppy = puppies.get(userId);
  if (!puppy) {
    puppy = createNewPuppy(userId, puppyName || 'My Puppy');
  }
  return puppy;
}

function getCommunityPuppy() {
  const availablePuppies = Array.from(communityPuppies.values()).filter(p => !p.dead);
  if (availablePuppies.length === 0) {
    const newPuppy = createNewPuppy(null, 'Lonely Puppy', 'labrador');
    newPuppy.inCommunity = true;
    communityPuppies.set(newPuppy.id, newPuppy);
    return newPuppy;
  }
  
  availablePuppies.sort((a, b) => a.lastActiveTime - b.lastActiveTime);
  return availablePuppies[0];
}

function createNewPuppy(userId, name = 'My Puppy', breedId = 'labrador') {
  const breed = DOG_BREEDS[breedId] || DOG_BREEDS['labrador'];
  
  const puppy = {
    id: generateId(),
    name: name,
    breed: breedId,
    breedInfo: breed,
    owner: userId,
    birthTime: Date.now(),
    happiness: 50,
    energy: 50,
    skills: [],
    level: 1,
    lastUpdateTime: Date.now(),
    lastActiveTime: Date.now(),
    dead: false,
    inCommunity: false,
    messages: [`🐶 Meet ${name}, your new ${breed.name}! ${breed.description}`],
  };
  
  if (userId) {
    puppies.set(userId, puppy);
  }
  return puppy;
}

function getPuppyAge(puppy) {
  const now = Date.now();
  const msPerDay = 1000 * 60 * 5; // 5 minutes = 1 day
  return ((now - puppy.birthTime) / msPerDay).toFixed(1);
}

function updatePuppyStats(puppy) {
  const now = Date.now();
  let msPerEnergyLoss = 1000 * 60 * 2; // 1 energy lost every 2 minutes
  
  // Apply breed-specific hunger decay reduction
  const breedInfo = puppy.breedInfo || DOG_BREEDS['labrador'];
  if (breedInfo.hungerDecayReduction) {
    msPerEnergyLoss = msPerEnergyLoss / (1 - breedInfo.hungerDecayReduction);
  }
  
  const elapsed = now - puppy.lastUpdateTime;
  const energyLoss = Math.floor(elapsed / msPerEnergyLoss);
  if (energyLoss > 0) {
    puppy.energy = Math.min(100, Math.max(0, puppy.energy - energyLoss));
    // Happiness also slowly decreases over time (1 per 4 minutes)
    const happinessLoss = Math.floor(elapsed / (1000 * 60 * 4));
    if (happinessLoss > 0) {
      puppy.happiness = Math.max(0, puppy.happiness - happinessLoss);
    }
    puppy.lastUpdateTime += energyLoss * msPerEnergyLoss;
  }
  
  // Update death status based on energy
  if (puppy.energy <= 0) {
    puppy.dead = true;
  } else if (puppy.dead) {
    puppy.dead = false; // Auto-revive if has energy
  }
}

function updateLevel(puppy) {
  puppy.level = 1 + Math.floor(puppy.skills.length / 5);
}

function checkForHiddenSkills(message, puppy) {
  if (!message) return null;
  
  const lowerMessage = message.toLowerCase();
  const newSkills = [];
  
  for (const hiddenSkill of HIDDEN_SKILLS) {
    if (puppy.skills.includes(hiddenSkill.skill)) continue;
    
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

// =============================================================================
// ENDPOINTS
// =============================================================================

// Get available breeds
app.get('/api/breeds', (req, res) => {
  const breeds = Object.keys(DOG_BREEDS).map(breedId => ({
    id: breedId,
    ...DOG_BREEDS[breedId]
  }));
  res.json({ breeds });
});

// Get puppy state
app.get('/api/puppy', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const mode = req.query.mode || 'personal';
  const { sessionId: newSessionId, userId } = getUserSession(sessionId);
  
  let puppy;
  let userPuppyInCommunity = null;
  
  if (mode === 'community') {
    puppy = getCommunityPuppy();
  } else {
    puppy = puppies.get(userId);
    
    if (!puppy) {
      userPuppyInCommunity = Array.from(communityPuppies.values()).find(p => p.owner === userId);
      
      if (userPuppyInCommunity) {
        return res.json({
          userPuppyInCommunity: {
            id: userPuppyInCommunity.id,
            name: userPuppyInCommunity.name,
            age: getPuppyAge(userPuppyInCommunity),
            happiness: userPuppyInCommunity.happiness,
            energy: userPuppyInCommunity.energy,
            skills: userPuppyInCommunity.skills.length,
            level: userPuppyInCommunity.level
          },
          sessionId: newSessionId,
          userId: userId,
          mode: mode,
          needsReclaim: true
        });
      }
      
      puppy = getUserPuppy(userId);
    }
  }
  
  updatePuppyStats(puppy);
  updateLevel(puppy);
  puppy.lastActiveTime = Date.now();
  
  res.json({ 
    ...puppy, 
    age: getPuppyAge(puppy),
    sessionId: newSessionId,
    userId: userId,
    mode: mode
  });
});

// Create new puppy
app.post('/api/puppy/create', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { name, breedId } = req.body;
  const { sessionId: newSessionId, userId } = getUserSession(sessionId);
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const puppy = createNewPuppy(userId, name, breedId);
  updateLevel(puppy);
  
  res.json({ 
    ...puppy, 
    age: getPuppyAge(puppy),
    sessionId: newSessionId,
    userId: userId,
    mode: 'personal'
  });
});

// Reclaim puppy from community
app.post('/api/puppy/reclaim', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { userId } = getUserSession(sessionId);
  
  const userPuppyInCommunity = Array.from(communityPuppies.values()).find(p => p.owner === userId);
  
  if (!userPuppyInCommunity) {
    return res.status(404).json({ error: 'No puppy found in community' });
  }
  
  if (puppies.has(userId)) {
    return res.status(400).json({ error: 'You already have a personal puppy!' });
  }
  
  userPuppyInCommunity.inCommunity = false;
  userPuppyInCommunity.lastActiveTime = Date.now();
  
  puppies.set(userId, userPuppyInCommunity);
  communityPuppies.delete(userPuppyInCommunity.id);
  
  updatePuppyStats(userPuppyInCommunity);
  updateLevel(userPuppyInCommunity);
  
  res.json({ 
    ...userPuppyInCommunity, 
    age: getPuppyAge(userPuppyInCommunity),
    message: `Welcome back, ${userPuppyInCommunity.name}! Your puppy missed you! 🏠`,
    userId: userId,
    mode: 'personal'
  });
});

// Share puppy to community  
app.post('/api/puppy/share', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { userId } = getUserSession(sessionId);
  
  const puppy = getUserPuppy(userId);
  if (!puppy) {
    return res.status(404).json({ error: 'No puppy found' });
  }
  
  puppy.inCommunity = true;
  puppy.lastActiveTime = Date.now();
  communityPuppies.set(puppy.id, puppy);
  puppies.delete(userId);
  
  res.json({ 
    message: `${puppy.name} has been shared with the community! Others can now help take care of them.`,
    success: true
  });
});

// Adopt community puppy
app.post('/api/puppy/adopt', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { puppyId } = req.body;
  const { userId } = getUserSession(sessionId);
  
  const communityPuppy = communityPuppies.get(puppyId);
  if (!communityPuppy) {
    return res.status(404).json({ error: 'Community puppy not found' });
  }
  
  if (puppies.has(userId)) {
    return res.status(400).json({ error: 'You already have a puppy! Share it to community first.' });
  }
  
  communityPuppy.owner = userId;
  communityPuppy.inCommunity = false;
  communityPuppy.lastActiveTime = Date.now();
  
  puppies.set(userId, communityPuppy);
  communityPuppies.delete(puppyId);
  
  res.json({ 
    ...communityPuppy, 
    age: getPuppyAge(communityPuppy),
    message: `You adopted ${communityPuppy.name}! Welcome to your new family member!`,
    userId: userId,
    mode: 'personal'
  });
});

// Get community puppies list
app.get('/api/community', (req, res) => {
  const puppiesList = Array.from(communityPuppies.values())
    .map(puppy => ({
      id: puppy.id,
      name: puppy.name,
      age: getPuppyAge(puppy),
      happiness: puppy.happiness,
      energy: puppy.energy,
      skills: puppy.skills.length,
      level: puppy.level,
      dead: puppy.dead,
      lastActiveTime: puppy.lastActiveTime
    }))
    .sort((a, b) => a.lastActiveTime - b.lastActiveTime);
    
  res.json(puppiesList);
});

// Main action endpoint (feed, play, train, talk)
app.post('/api/puppy/action', (req, res) => {
  const { action, message } = req.body;
  const sessionId = req.headers['x-session-id'];
  const mode = req.query.mode || 'personal';
  const { userId } = getUserSession(sessionId);
  
  let puppy;
  if (mode === 'community') {
    puppy = getCommunityPuppy();
  } else {
    puppy = getUserPuppy(userId);
  }
  
  updatePuppyStats(puppy);
  
  if (puppy.dead && action !== 'feed') {
    return res.json({ 
      ...puppy, 
      age: getPuppyAge(puppy), 
      message: 'Your puppy is too weak to do anything. Try feeding it!',
      actionBlocked: true,
      mode: mode
    });
  }
  
  const breedInfo = puppy.breedInfo || DOG_BREEDS['labrador'];
  
  if (action === 'train') {
    if (puppy.energy <= 20) {
      return res.json({ 
        ...puppy, 
        age: getPuppyAge(puppy), 
        message: 'Your puppy is too tired to focus on training! Feed it first. 🍖',
        actionBlocked: true,
        mode: mode
      });
    }
    if (puppy.happiness < 20) {
      return res.json({ 
        ...puppy, 
        age: getPuppyAge(puppy), 
        message: 'Your puppy is too sad to focus on training! Play with it first. 😢',
        actionBlocked: true,
        mode: mode
      });
    }
    
    const availableTricks = DOG_TRICKS.filter(trick => !puppy.skills.includes(trick));
    if (availableTricks.length > 0) {
      if (puppy.happiness < 10) {
        puppy.energy = Math.max(0, puppy.energy - 15);
        return res.json({ 
          ...puppy, 
          age: getPuppyAge(puppy), 
          message: 'Your puppy is too depressed to learn anything new! 💔 Try playing and talking to cheer it up first.',
          actionBlocked: false,
          mode: mode
        });
      }
      
      const totalSkills = puppy.skills.length;
      let failureChance = Math.min(0.7, totalSkills * 0.05);
      if (breedInfo.trainingBonus) {
        failureChance = Math.max(0, failureChance - breedInfo.trainingBonus);
      }
      if (breedInfo.skillLearningBonus) {
        failureChance = Math.max(0, failureChance - breedInfo.skillLearningBonus);
      }
      
      const random = Math.random();
      
      if (random < failureChance) {
        puppy.energy = Math.max(0, puppy.energy - 15);
        puppy.lastMessage = `Training was challenging! Your puppy tried hard but didn't learn anything new this time. (${Math.round(failureChance * 100)}% difficulty) 😅`;
      } else {
        const trick = availableTricks[Math.floor(Math.random() * availableTricks.length)];
        puppy.skills.push(trick);
        
        if (puppy.happiness >= 80 && availableTricks.length > 1 && random > 0.5) {
          const secondTrick = availableTricks.filter(t => t !== trick)[Math.floor(Math.random() * (availableTricks.length - 1))];
          puppy.skills.push(secondTrick);
          puppy.lastMessage = `🌟 Amazing! Your happy puppy learned TWO skills: "${trick}" and "${secondTrick}"! 🎉`;
        } else {
          puppy.lastMessage = `Great! Your puppy learned "${trick}"! 🎓`;
        }
        
        puppy.energy = Math.max(0, puppy.energy - 15);
      }
    } else {
      puppy.lastMessage = 'Your puppy has learned all the basic tricks! Try chatting to unlock hidden skills! 💬';
    }
  }
  
  if (action === 'play') {
    if (puppy.energy <= 10) {
      return res.json({ 
        ...puppy, 
        age: getPuppyAge(puppy), 
        message: 'Your puppy is too tired to play! Feed it first. 🍖',
        actionBlocked: true,
        mode: mode
      });
    }
    
    let happinessGain = 10;
    if (breedInfo.playHappinessBonus) {
      happinessGain += breedInfo.playHappinessBonus;
    }
    
    let energyCost = 5;
    if (puppy.happiness >= 95) {
      energyCost = 2;
      puppy.lastMessage = '✨ Your ecstatic puppy played with magical energy! No tiredness! ✨';
    } else {
      puppy.lastMessage = 'Your puppy had fun playing! 🎾';
    }
    
    if (breedInfo.energyEfficiency) {
      energyCost = Math.round(energyCost * (1 - breedInfo.energyEfficiency));
    }
    
    puppy.energy = Math.max(0, puppy.energy - energyCost);
    puppy.happiness = Math.min(100, puppy.happiness + happinessGain);
  }
  
  if (action === 'feed') {
    let energyGain;
    if (puppy.energy >= 80) {
      energyGain = 10;
      puppy.lastMessage = "Your puppy nibbled a bit but isn't very hungry. 🥱";
    } else if (puppy.energy >= 60) {
      energyGain = 15;
      puppy.lastMessage = "Your puppy ate some food but wasn't super hungry. 😊";
    } else if (puppy.energy >= 30) {
      energyGain = 20;
      puppy.lastMessage = "Your puppy enjoyed the meal! 😋";
    } else {
      energyGain = 25;
      puppy.lastMessage = "Your puppy devoured the food hungrily! 🤤";
    }
    
    puppy.energy = Math.min(100, puppy.energy + energyGain);
  }
  
  if (action === 'talk') {
    let happinessGain = 5;
    if (puppy.happiness >= 95) {
      happinessGain = 2;
    }
    
    puppy.happiness = Math.min(100, puppy.happiness + happinessGain);
    let reply = "Woof! I love talking to you! 🐾";
    let newHiddenSkills = null;
    
    if (message) {
      newHiddenSkills = checkForHiddenSkills(message, puppy);
      
      if (newHiddenSkills && newHiddenSkills.length > 0) {
        reply = `🎉 WOW! I just learned "${newHiddenSkills[0]}"! You're amazing! 🌟`;
      } else if (puppy.happiness >= 100) {
        reply = "✨ I'm so incredibly happy! I feel like I could learn anything! ✨ 🌈";
      } else if (message.toLowerCase().includes('hello')) reply = "Woof woof! Hello! 🐶";
      else if (message.toLowerCase().includes('hungry')) reply = "I could use a snack! 🍖";
      else if (message.toLowerCase().includes('play')) reply = "Let's play fetch! 🎾";
      else if (message.toLowerCase().includes('good')) reply = "You're a good human! 🥰";
      else if (message.toLowerCase().includes('love')) reply = "I love you too! ❤️";
      else if (message.toLowerCase().includes('trick')) reply = "Want to see my tricks? Try training me more! 🎪";
      else if (message.toLowerCase().includes('secret')) reply = "Psst... try talking about different topics to unlock my hidden talents! 🤫";
    }
    
    updateLevel(puppy);
    puppy.lastUpdateTime = Date.now();
    puppy.lastActiveTime = Date.now();
    
    return res.json({ 
      puppy: { ...puppy, age: getPuppyAge(puppy), mode: mode }, 
      reply,
      newSkills: newHiddenSkills
    });
  }
  
  updateLevel(puppy);
  puppy.lastUpdateTime = Date.now();
  puppy.lastActiveTime = Date.now();
  
  const response = { ...puppy, age: getPuppyAge(puppy), actionBlocked: false, mode: mode };
  if (puppy.lastMessage) {
    response.message = puppy.lastMessage;
    delete puppy.lastMessage;
  }
  
  res.json(response);
});

// Chat with puppy (for hidden skills)
app.post('/api/puppy/chat', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { message, mode } = req.body;
  const { sessionId: newSessionId, userId } = getUserSession(sessionId);
  
  const puppy = mode === 'community' ? getCommunityPuppy() : getUserPuppy(userId);
  if (!puppy) {
    return res.status(404).json({ error: 'No puppy found' });
  }

  updatePuppyStats(puppy);
  if (puppy.energy <= 0) {
    return res.status(400).json({ error: 'Puppy has died and cannot chat' });
  }

  const breedInfo = puppy.breedInfo || DOG_BREEDS['labrador'];
  let hiddenSkillChance = 1.0;
  if (breedInfo.hiddenSkillBonus) {
    hiddenSkillChance += breedInfo.hiddenSkillBonus;
  }
  
  const discoveredSkills = [];
  if (message && Math.random() <= hiddenSkillChance) {
    const newSkills = checkForHiddenSkills(message, puppy);
    if (newSkills) {
      discoveredSkills.push(...newSkills);
      if (breedInfo.hiddenSkillBonus > 0) {
        puppy.messages.push(`✨ ${puppy.name} discovered: ${newSkills.join(', ')}! (${breedInfo.name} specialty - better at finding hidden skills!)`);
      } else {
        puppy.messages.push(`✨ ${puppy.name} discovered: ${newSkills.join(', ')}!`);
      }
    }
  }

  const responses = [
    `🐕 ${puppy.name} wags their tail!`,
    `🐶 ${puppy.name} looks at you happily!`,
    `🎾 ${puppy.name} wants to play!`,
    `❤️ ${puppy.name} loves spending time with you!`
  ];

  if (discoveredSkills.length === 0) {
    puppy.messages.push(responses[Math.floor(Math.random() * responses.length)]);
  }

  updateLevel(puppy);
  puppy.lastUpdateTime = Date.now();
  if (mode !== 'community') puppy.lastActiveTime = Date.now();
  
  res.json({ 
    ...puppy, 
    sessionId: newSessionId,
    mode,
    discoveredSkills
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
}); 