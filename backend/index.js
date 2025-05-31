const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Puppy storage system
let puppies = new Map(); // userId -> puppy data
let communityPuppies = new Map(); // puppyId -> puppy data
let sessions = new Map(); // sessionId -> userId

// Generate unique IDs
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Default puppy template
function createNewPuppy(name = 'Puppy', userId = null) {
  return {
    id: generateId(),
    name: name,
    owner: userId,
    birthTime: Date.now(),
    happiness: 50,
    energy: 50,
    skills: [],
    level: 1,
    lastUpdateTime: Date.now(),
    dead: false,
    inCommunity: false,
    lastActiveTime: Date.now(),
  };
}

// Legacy global puppy (now becomes first community puppy)
let globalPuppy = {
  id: 'global',
  name: 'Community Puppy',
  owner: null,
  birthTime: Date.now() - (1000 * 60 * 60), // 1 hour old
  happiness: 50,
  energy: 50,
  skills: [],
  level: 1,
  lastUpdateTime: Date.now(),
  dead: false,
  inCommunity: true,
  lastActiveTime: Date.now(),
};

// Initialize with global puppy in community
communityPuppies.set('global', globalPuppy);

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

// Helper to get or create user session
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

// Helper to get user's puppy or create new one
function getUserPuppy(userId, puppyName = null) {
  let puppy = puppies.get(userId);
  if (!puppy) {
    puppy = createNewPuppy(puppyName || 'My Puppy', userId);
    puppies.set(userId, puppy);
  }
  return puppy;
}

// Helper to get a community puppy
function getCommunityPuppy() {
  // Find a random community puppy that needs care
  const availablePuppies = Array.from(communityPuppies.values()).filter(p => !p.dead);
  if (availablePuppies.length === 0) {
    // Create a new community puppy if none available
    const newPuppy = createNewPuppy('Lonely Puppy', null);
    newPuppy.inCommunity = true;
    communityPuppies.set(newPuppy.id, newPuppy);
    return newPuppy;
  }
  
  // Prioritize puppies that haven't been cared for recently
  availablePuppies.sort((a, b) => a.lastActiveTime - b.lastActiveTime);
  return availablePuppies[0];
}

// Helper to calculate age in days
function getPuppyAge(puppy) {
  const now = Date.now();
  const msPerDay = 1000 * 60; // 1 minute = 1 day (much faster aging!)
  return ((now - puppy.birthTime) / msPerDay).toFixed(1); // 1 decimal place
}

// Helper to update energy based on time passed
function updateEnergy(puppy) {
  const now = Date.now();
  const msPerEnergyLoss = 1000 * 60 * 2; // 1 energy lost every 2 minutes
  const elapsed = now - puppy.lastUpdateTime;
  const energyLoss = Math.floor(elapsed / msPerEnergyLoss);
  if (energyLoss > 0) {
    puppy.energy = Math.max(0, puppy.energy - energyLoss); // Energy decreases over time
    // Happiness also slowly decreases over time (1 per 4 minutes)
    const happinessLoss = Math.floor(elapsed / (1000 * 60 * 4));
    if (happinessLoss > 0) {
      puppy.happiness = Math.max(0, puppy.happiness - happinessLoss);
    }
    puppy.lastUpdateTime += energyLoss * msPerEnergyLoss;
  }
  // If energy reaches 0, puppy dies (starving)
  if (puppy.energy <= 0) {
    puppy.dead = true;
  }
}

// Helper to update level based on skills
function updateLevel(puppy) {
  puppy.level = 1 + Math.floor(puppy.skills.length / 5);
}

// Helper to check for hidden skills in chat message
function checkForHiddenSkills(message, puppy) {
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
  const sessionId = req.headers['x-session-id'];
  const mode = req.query.mode || 'personal'; // 'personal' or 'community'
  const { sessionId: newSessionId, userId } = getUserSession(sessionId);
  
  let puppy;
  let userPuppyInCommunity = null;
  
  if (mode === 'community') {
    puppy = getCommunityPuppy();
  } else {
    // Personal mode - check if user has a puppy
    puppy = puppies.get(userId);
    
    if (!puppy) {
      // Check if user's puppy is in community
      userPuppyInCommunity = Array.from(communityPuppies.values()).find(p => p.owner === userId);
      
      if (userPuppyInCommunity) {
        // User has a puppy in community - don't create new one
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
      
      // No puppy anywhere - create new one
      puppy = getUserPuppy(userId);
    }
  }
  
  updateEnergy(puppy);
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

// Endpoint to reclaim puppy from community
app.post('/api/puppy/reclaim', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { userId } = getUserSession(sessionId);
  
  // Find user's puppy in community
  const userPuppyInCommunity = Array.from(communityPuppies.values()).find(p => p.owner === userId);
  
  if (!userPuppyInCommunity) {
    return res.status(404).json({ error: 'No puppy found in community' });
  }
  
  // Check if user already has a personal puppy (shouldn't happen, but safety check)
  if (puppies.has(userId)) {
    return res.status(400).json({ error: 'You already have a personal puppy!' });
  }
  
  // Move puppy back to personal
  userPuppyInCommunity.inCommunity = false;
  userPuppyInCommunity.lastActiveTime = Date.now();
  
  puppies.set(userId, userPuppyInCommunity);
  communityPuppies.delete(userPuppyInCommunity.id);
  
  updateEnergy(userPuppyInCommunity);
  updateLevel(userPuppyInCommunity);
  
  res.json({ 
    ...userPuppyInCommunity, 
    age: getPuppyAge(userPuppyInCommunity),
    message: `Welcome back, ${userPuppyInCommunity.name}! Your puppy missed you! 🏠`,
    userId: userId,
    mode: 'personal'
  });
});

// Endpoint to create/rename puppy
app.post('/api/puppy/create', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { name } = req.body;
  const { sessionId: newSessionId, userId } = getUserSession(sessionId);
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  // Create new puppy with custom name
  const puppy = createNewPuppy(name.trim(), userId);
  puppies.set(userId, puppy);
  
  updateLevel(puppy);
  
  res.json({ 
    ...puppy, 
    age: getPuppyAge(puppy),
    sessionId: newSessionId,
    userId: userId,
    mode: 'personal'
  });
});

// Endpoint to share puppy to community
app.post('/api/puppy/share', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { userId } = getUserSession(sessionId);
  
  const puppy = getUserPuppy(userId);
  if (!puppy) {
    return res.status(404).json({ error: 'No puppy found' });
  }
  
  // Move to community
  puppy.inCommunity = true;
  puppy.lastActiveTime = Date.now();
  communityPuppies.set(puppy.id, puppy);
  puppies.delete(userId);
  
  res.json({ 
    message: `${puppy.name} has been shared with the community! Others can now help take care of them.`,
    success: true
  });
});

// Endpoint to adopt community puppy
app.post('/api/puppy/adopt', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { puppyId } = req.body;
  const { userId } = getUserSession(sessionId);
  
  const communityPuppy = communityPuppies.get(puppyId);
  if (!communityPuppy) {
    return res.status(404).json({ error: 'Community puppy not found' });
  }
  
  // Check if user already has a puppy
  if (puppies.has(userId)) {
    return res.status(400).json({ error: 'You already have a puppy! Share it to community first.' });
  }
  
  // Adopt the community puppy
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

// Endpoint to get community puppies list
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
    .sort((a, b) => a.lastActiveTime - b.lastActiveTime); // Most neglected first
    
  res.json(puppiesList);
});

// Endpoint to interact with puppy (feed, play, train, talk)
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
  
  updateEnergy(puppy);
  
  if (puppy.dead && action !== 'feed') {
    // Only allow feeding if dead
    return res.json({ 
      ...puppy, 
      age: getPuppyAge(puppy), 
      message: 'Your puppy is too weak to do anything. Try feeding it!',
      actionBlocked: true,
      mode: mode
    });
  }
  
  // Check action limitations based on energy and happiness levels
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
      // Very low happiness blocks skill learning
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
      
      // Normal training with difficulty scaling
      const totalSkills = puppy.skills.length;
      const failureChance = Math.min(0.7, totalSkills * 0.05); // 5% per skill, max 70%
      const random = Math.random();
      
      if (random < failureChance) {
        // Training failed
        puppy.energy = Math.max(0, puppy.energy - 15);
        puppy.lastMessage = `Training was challenging! Your puppy tried hard but didn't learn anything new this time. (${Math.round(failureChance * 100)}% difficulty) 😅`;
        return res.json({ 
          ...puppy, 
          age: getPuppyAge(puppy), 
          message: puppy.lastMessage,
          actionBlocked: false,
          mode: mode
        });
      }
      
      // Training succeeded
      const trick = availableTricks[Math.floor(Math.random() * availableTricks.length)];
      puppy.skills.push(trick);
      
      // High happiness improves training (learn bonus skill)
      if (puppy.happiness >= 80 && availableTricks.length > 1 && random > 0.5) {
        const secondTrick = availableTricks.filter(t => t !== trick)[Math.floor(Math.random() * (availableTricks.length - 1))];
        puppy.skills.push(secondTrick);
        puppy.lastMessage = `🌟 Amazing! Your happy puppy learned TWO skills: "${trick}" and "${secondTrick}"! 🎉`;
      } else {
        puppy.lastMessage = `Great! Your puppy learned "${trick}"! 🎓`;
      }
      
      puppy.energy = Math.max(0, puppy.energy - 15);
    } else {
      return res.json({ 
        ...puppy, 
        age: getPuppyAge(puppy), 
        message: 'Your puppy has learned all the basic tricks! Try chatting to unlock hidden skills! 💬',
        actionBlocked: false,
        mode: mode
      });
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
    let playMessage = 'Your puppy had fun playing! 🎾';
    
    // Maximum happiness unlocks special play ability
    if (puppy.happiness >= 95) {
      happinessGain = 5; // Less gain when already very happy
      puppy.energy = Math.max(0, puppy.energy - 2); // Uses less energy when super happy
      playMessage = '✨ Your ecstatic puppy played with magical energy! No tiredness! ✨';
    } else {
      puppy.energy = Math.max(0, puppy.energy - 5);
    }
    
    puppy.happiness = Math.min(100, puppy.happiness + happinessGain);
    puppy.lastMessage = playMessage;
  }
  
  if (action === 'feed') {
    // Diminishing returns based on current energy level
    let energyGain;
    if (puppy.energy >= 80) {
      energyGain = 10; // Very little gain when already full
      puppy.lastMessage = "Your puppy nibbled a bit but isn't very hungry. 🥱";
    } else if (puppy.energy >= 60) {
      energyGain = 15; // Reduced gain when moderately full
      puppy.lastMessage = "Your puppy ate some food but wasn't super hungry. 😊";
    } else if (puppy.energy >= 30) {
      energyGain = 20; // Normal gain when moderately hungry
      puppy.lastMessage = "Your puppy enjoyed the meal! 😋";
    } else {
      energyGain = 25; // Full gain when very hungry
      puppy.lastMessage = "Your puppy devoured the food hungrily! 🤤";
    }
    
    puppy.energy = Math.min(100, puppy.energy + energyGain);
    if (puppy.energy > 0) puppy.dead = false; // Revive if has energy
  }
  
  if (action === 'talk') {
    // Maximum happiness unlocks special talk ability
    let happinessGain = 5;
    if (puppy.happiness >= 95) {
      happinessGain = 2; // Less gain when already very happy
    }
    
    puppy.happiness = Math.min(100, puppy.happiness + happinessGain);
    let reply = "Woof! I love talking to you! 🐾";
    let newHiddenSkills = null;
    
    if (message) {
      // Check for hidden skills first
      newHiddenSkills = checkForHiddenSkills(message, puppy);
      
      // Special responses for hidden skills
      if (newHiddenSkills && newHiddenSkills.length > 0) {
        const skillName = newHiddenSkills[0].replace(/^[^\s]+ /, ''); // Remove emoji
        reply = `🎉 WOW! I just learned "${newHiddenSkills[0]}"! You're amazing! 🌟`;
      }
      // Special response for maximum happiness
      else if (puppy.happiness >= 100) {
        reply = "✨ I'm so incredibly happy! I feel like I could learn anything! ✨ 🌈";
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
    
    updateLevel(puppy);
    puppy.lastUpdateTime = Date.now();
    puppy.lastActiveTime = Date.now();
    
    return res.json({ 
      puppy: { ...puppy, age: getPuppyAge(puppy), mode: mode }, 
      reply,
      newSkills: newHiddenSkills // Send info about newly unlocked skills
    });
  }
  
  updateLevel(puppy);
  puppy.lastUpdateTime = Date.now();
  puppy.lastActiveTime = Date.now();
  
  // Include any action messages in the response
  const response = { ...puppy, age: getPuppyAge(puppy), actionBlocked: false, mode: mode };
  if (puppy.lastMessage) {
    response.message = puppy.lastMessage;
    delete puppy.lastMessage; // Clear the message after sending
  }
  
  res.json(response);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
}); 