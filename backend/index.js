const express = require('express');
const cors = require('cors');
const { initializeDatabase, db } = require('./database');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
initializeDatabase();

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

async function getUserSession(sessionId) {
  if (!sessionId) {
    sessionId = generateId();
    const userId = generateId();
    await db.createUser(userId, sessionId);
    return { sessionId, userId, isNew: true };
  }
  
  const userId = await db.getUserBySession(sessionId);
  if (!userId) {
    const newUserId = generateId();
    await db.createUser(newUserId, sessionId);
    return { sessionId, userId: newUserId, isNew: true };
  }
  
  return { sessionId, userId, isNew: false };
}

async function getUserPuppy(userId, puppyName = null) {
  let puppy = await db.getPuppyByOwner(userId);
  // Don't auto-create puppy - let the API endpoint handle this
  return puppy;
}

async function getCommunityPuppy() {
  const availablePuppies = await db.getCommunityPuppies();
  const alivePuppies = availablePuppies.filter(p => !p.dead);
  
  if (alivePuppies.length === 0) {
    const newPuppy = await createNewPuppy(null, 'Lonely Puppy', 'labrador');
    newPuppy.inCommunity = true;
    await db.createPuppy(newPuppy);
    await db.movePuppyToCommunity(newPuppy.id);
    return newPuppy;
  }
  
  alivePuppies.sort((a, b) => a.lastActiveTime - b.lastActiveTime);
  return alivePuppies[0];
}

async function createNewPuppy(userId, name = 'My Puppy', breedId = 'labrador') {
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
    await db.createPuppy(puppy);
  }
  return puppy;
}

function getPuppyAge(puppy) {
  const now = Date.now();
  const msPerDay = 1000 * 60 * 5; // 5 minutes = 1 day
  return ((now - puppy.birthTime) / msPerDay).toFixed(1);
}

async function updatePuppyStats(puppy) {
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
  
  // Save updated stats to database
  await db.createPuppy(puppy);
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

// Community activity tracking
async function addCommunityActivity(type, puppyName, userName, details = '') {
  const activity = {
    id: generateId(),
    type, // 'share', 'adopt', 'care', 'levelup', 'skill'
    puppyName,
    userName: userName || 'Anonymous',
    details,
    timestamp: Date.now()
  };
  
  await db.addCommunityActivity(activity);
}

// Update puppy popularity
async function updatePopularity(puppyId, type) {
  await db.updatePopularity(puppyId, type);
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
app.get('/api/puppy', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const mode = req.query.mode || 'personal';
  const { sessionId: newSessionId, userId } = await getUserSession(sessionId);
  
  let puppy;
  let userPuppyInCommunity = null;
  
  if (mode === 'community') {
    puppy = await getCommunityPuppy();
  } else {
    puppy = await getUserPuppy(userId);
    
    if (!puppy) {
      userPuppyInCommunity = (await db.getCommunityPuppies()).find(p => p.owner === userId);
      
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
      
      // No puppy found, need to create new one
      return res.json({
        sessionId: newSessionId,
        userId: userId,
        mode: mode,
        needsNewPuppy: true
      });
    }
  }
  
  await updatePuppyStats(puppy);
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
app.post('/api/puppy/create', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { name, breedId } = req.body;
  const { sessionId: newSessionId, userId } = await getUserSession(sessionId);
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const puppy = await createNewPuppy(userId, name, breedId);
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
app.post('/api/puppy/reclaim', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { userId } = await getUserSession(sessionId);
  
  const userPuppyInCommunity = (await db.getCommunityPuppies()).find(p => p.owner === userId);
  
  if (!userPuppyInCommunity) {
    return res.status(404).json({ error: 'No puppy found in community' });
  }
  
  if (await db.getPuppyByOwner(userId)) {
    return res.status(400).json({ error: 'You already have a personal puppy!' });
  }
  
  userPuppyInCommunity.inCommunity = false;
  userPuppyInCommunity.lastActiveTime = Date.now();
  
  await db.createPuppy(userPuppyInCommunity);
  await db.adoptPuppyFromCommunity(userPuppyInCommunity.id, userId);
  
  await updatePuppyStats(userPuppyInCommunity);
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
app.post('/api/puppy/share', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { userId } = await getUserSession(sessionId);
  
  const puppy = await getUserPuppy(userId);
  if (!puppy) {
    return res.status(404).json({ error: 'No puppy found' });
  }
  
  puppy.inCommunity = true;
  puppy.lastActiveTime = Date.now();
  await db.createPuppy(puppy);
  await db.movePuppyToCommunity(puppy.id);
  
  // Track activity and initialize popularity
  await addCommunityActivity('share', puppy.name, 'Someone', `shared their ${puppy.breedInfo.name} to the community`);
  await updatePopularity(puppy.id, 'views');
  await updatePopularity(puppy.id, 'interactions');
  
  res.json({ 
    message: `${puppy.name} has been shared with the community! Others can now help take care of them.`,
    success: true
  });
});

// Adopt community puppy
app.post('/api/puppy/adopt', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { puppyId } = req.body;
  const { userId } = await getUserSession(sessionId);
  
  const communityPuppy = (await db.getCommunityPuppies()).find(p => p.id === puppyId);
  if (!communityPuppy) {
    return res.status(404).json({ error: 'Community puppy not found' });
  }
  
  if (await db.getPuppyByOwner(userId)) {
    return res.status(400).json({ error: 'You already have a puppy! Share it to community first.' });
  }
  
  communityPuppy.owner = userId;
  communityPuppy.inCommunity = false;
  communityPuppy.lastActiveTime = Date.now();
  
  await db.createPuppy(communityPuppy);
  await db.adoptPuppyFromCommunity(puppyId, userId);
  
  // Track activity and popularity
  await addCommunityActivity('adopt', communityPuppy.name, 'Someone', `adopted ${communityPuppy.name} from the community`);
  await updatePopularity(puppyId, 'adoptions');
  
  res.json({ 
    ...communityPuppy, 
    age: getPuppyAge(communityPuppy),
    message: `You adopted ${communityPuppy.name}! Welcome to your new family member!`,
    userId: userId,
    mode: 'personal'
  });
});

// Get community puppies list
app.get('/api/community', async (req, res) => {
  const allPuppies = await db.getCommunityPuppies();
  const puppiesList = await Promise.all(allPuppies.map(async puppy => {
    const popularity = await db.getPopularity(puppy.id);
    return {
      id: puppy.id,
      name: puppy.name,
      age: getPuppyAge(puppy),
      happiness: puppy.happiness,
      energy: puppy.energy,
      skills: puppy.skills.length,
      level: puppy.level,
      dead: puppy.dead,
      lastActiveTime: puppy.lastActiveTime,
      breed: puppy.breedInfo.name,
      popularity: popularity
    };
  }));
  
  puppiesList.sort((a, b) => a.lastActiveTime - b.lastActiveTime);
  res.json(puppiesList);
});

// Get community leaderboards
async function getCommunityLeaderboards() {
  const allPuppies = await db.getCommunityPuppies();
  
  return {
    highestLevel: allPuppies
      .filter(p => !p.dead)
      .sort((a, b) => b.level - a.level)
      .slice(0, 10)
      .map(p => ({ name: p.name, breed: p.breedInfo.name, level: p.level, age: getPuppyAge(p) })),
      
    mostSkilled: allPuppies
      .filter(p => !p.dead)
      .sort((a, b) => b.skills.length - a.skills.length)
      .slice(0, 10)
      .map(p => ({ name: p.name, breed: p.breedInfo.name, skills: p.skills.length, level: p.level })),
      
    oldest: allPuppies
      .filter(p => !p.dead)
      .sort((a, b) => a.birthTime - b.birthTime)
      .slice(0, 10)
      .map(p => ({ name: p.name, breed: p.breedInfo.name, age: getPuppyAge(p), level: p.level })),
      
    mostPopular: await Promise.all(allPuppies
      .filter(p => !p.dead)
      .map(async p => ({
        name: p.name,
        breed: p.breedInfo.name,
        level: p.level,
        popularity: await db.getPopularity(p.id)
      })))
      .then(puppies => puppies.sort((a, b) => (b.popularity.interactions + b.popularity.views) - (a.popularity.interactions + a.popularity.views)))
      .then(puppies => puppies.slice(0, 10))
  };
}

// Helper to format time ago
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Get community activity feed
app.get('/api/community/activity', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const activities = await db.getCommunityActivity(limit);
  const activitiesWithTimeAgo = activities.map(activity => ({
    ...activity,
    timeAgo: getTimeAgo(activity.timestamp)
  }));
  res.json(activitiesWithTimeAgo);
});

// Get community stats overview
app.get('/api/community/stats', async (req, res) => {
  const allPuppies = await db.getCommunityPuppies();
  const alivePuppies = allPuppies.filter(p => !p.dead);
  
  const breedStats = alivePuppies.reduce((acc, puppy) => {
    const breed = puppy.breedInfo.name;
    acc[breed] = (acc[breed] || 0) + 1;
    return acc;
  }, {});
  
  const activities = await db.getCommunityActivity(50);
  
  const stats = {
    totalPuppies: allPuppies.length,
    alivePuppies: alivePuppies.length,
    averageLevel: alivePuppies.length > 0 ? 
      (alivePuppies.reduce((sum, p) => sum + p.level, 0) / alivePuppies.length).toFixed(1) : 0,
    averageAge: alivePuppies.length > 0 ? 
      (alivePuppies.reduce((sum, p) => sum + parseFloat(getPuppyAge(p)), 0) / alivePuppies.length).toFixed(1) : 0,
    breedDistribution: Object.entries(breedStats)
      .sort(([,a], [,b]) => b - a)
      .reduce((acc, [breed, count]) => {
        acc[breed] = count;
        return acc;
      }, {}),
    recentActivity: activities.length
  };
  
  res.json(stats);
});

// Get community leaderboards
app.get('/api/community/leaderboards', async (req, res) => {
  try {
    const leaderboards = await getCommunityLeaderboards();
    res.json(leaderboards);
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboards' });
  }
});

// Main action endpoint (feed, play, train, talk)
app.post('/api/action', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { action, puppyId, mode = 'personal' } = req.body;
  const { userId } = await getUserSession(sessionId);
  
  let puppy;
  
  if (mode === 'community') {
    if (puppyId) {
      // Care for specific community puppy
      puppy = (await db.getCommunityPuppies()).find(p => p.id === puppyId);
      if (!puppy) {
        return res.status(404).json({ error: 'Community puppy not found' });
      }
    } else {
      // Care for random community puppy (original behavior)
      puppy = await getCommunityPuppy();
    }
    // Track that someone viewed/interacted with this community puppy
    await updatePopularity(puppy.id, 'interactions');
    
    if (action === 'feed') {
      await addCommunityActivity('care', puppy.name, 'Someone', 'fed the puppy');
    } else if (action === 'play') {
      await addCommunityActivity('care', puppy.name, 'Someone', 'played with the puppy');
    }
  } else {
    puppy = await getUserPuppy(userId);
  }
  
  await updatePuppyStats(puppy);
  
  if (puppy.dead && action !== 'feed') {
    return res.status(400).json({ 
      error: `${puppy.name} has died and can only be revived by feeding!`,
      dead: true 
    });
  }

  // Rest of the action logic stays the same...
  let message = '';
  let skillGained = false;
  let newSkills = [];
  
  switch (action) {
    case 'feed':
      if (puppy.energy >= 100) {
        message = `${puppy.name} is already full and didn't eat much! 🥱 They're quite satisfied.`;
      } else {
        puppy.energy = Math.min(100, puppy.energy + 30);
        puppy.happiness = Math.min(100, puppy.happiness + 10);
        message = `You fed ${puppy.name}! 🍖`;
        
        if (Math.random() < 0.3) {
          const newSkill = getRandomSkill(puppy.skills);
          if (newSkill) {
            puppy.skills.push(newSkill);
            skillGained = true;
            newSkills.push(newSkill);
            message += ` ${puppy.name} learned ${newSkill}!`;
          }
        }
      }
      break;
      
    case 'play':
      if (puppy.energy < 20) {
        message = `${puppy.name} is too tired to play! 😴 They need to eat something first to get energy.`;
      } else {
        puppy.energy = Math.max(0, puppy.energy - 15);
        puppy.happiness = Math.min(100, puppy.happiness + 20);
        message = `You played with ${puppy.name}! 🎾`;
        
        if (Math.random() < 0.4) {
          const newSkill = getRandomSkill(puppy.skills);
          if (newSkill) {
            puppy.skills.push(newSkill);
            skillGained = true;
            newSkills.push(newSkill);
            message += ` ${puppy.name} learned ${newSkill} while playing!`;
          }
        }
      }
      break;
      
    case 'train':
      if (puppy.energy < 25) {
        message = `${puppy.name} is too tired to train! 😴 They need more energy before focusing on training.`;
      } else {
        puppy.energy = Math.max(0, puppy.energy - 20);
        puppy.happiness = Math.max(0, puppy.happiness - 5);
        message = `You trained ${puppy.name}! 🎯`;
        
        if (Math.random() < 0.6) {
          const newSkill = getRandomSkill(puppy.skills);
          if (newSkill) {
            puppy.skills.push(newSkill);
            skillGained = true;
            newSkills.push(newSkill);
            message += ` ${puppy.name} mastered ${newSkill}!`;
          }
        }
      }
      break;
      
    case 'talk':
      if (puppy.energy < 5) {
        message = `${puppy.name} is too sleepy to talk! 😴 Maybe feed them first?`;
      } else {
        puppy.energy = Math.max(0, puppy.energy - 3);
        puppy.happiness = Math.min(100, puppy.happiness + 5);
        message = `You talked to ${puppy.name}! 💬`;
      }
      break;
      
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
  
  if (skillGained) {
    await addCommunityActivity('skill', puppy.name, 'Someone', `learned new skill: ${newSkills.join(', ')}`);
  }
  
  const oldLevel = puppy.level;
  updateLevel(puppy);
  
  if (puppy.level > oldLevel) {
    message += ` 🎉 Level up! ${puppy.name} is now level ${puppy.level}!`;
    await addCommunityActivity('levelup', puppy.name, 'Someone', `reached level ${puppy.level}`);
  }
  
  puppy.lastActiveTime = Date.now();
  await updatePuppyStats(puppy);
  
  res.json({ 
    ...puppy, 
    age: getPuppyAge(puppy),
    message: message,
    skillGained: skillGained,
    newSkills: newSkills,
    levelUp: puppy.level > oldLevel
  });
});

// Chat with puppy
app.post('/api/puppy/chat', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { message } = req.body;
  const { userId } = await getUserSession(sessionId);
  
  const puppy = await getUserPuppy(userId);
  if (!puppy) {
    return res.status(404).json({ error: 'No puppy found' });
  }
  
  await updatePuppyStats(puppy);
  if (puppy.energy <= 0) {
    return res.status(400).json({ error: 'Puppy has died and cannot chat' });
  }
  
  const hiddenSkills = checkForHiddenSkills(message, puppy);
  let responseMessage = '';
  
  if (hiddenSkills && hiddenSkills.length > 0) {
    responseMessage = `🎉 ${puppy.name} discovered hidden skills: ${hiddenSkills.join(', ')}! `;
    await addCommunityActivity('skill', puppy.name, 'Someone', `discovered hidden skills: ${hiddenSkills.join(', ')}`);
  }
  
  const responses = [
    `🐕 Woof! ${puppy.name} wags tail happily!`,
    `🎾 ${puppy.name} wants to play more!`,
    `❤️ ${puppy.name} loves you so much!`,
    `🍖 ${puppy.name} thinks about treats...`,
    `😴 ${puppy.name} yawns sleepily`,
    `🏃 ${puppy.name} runs in circles excitedly!`
  ];
  
  const breedSpecificResponses = {
    'border-collie': [`🧠 ${puppy.name} tilts head intelligently`, `🐑 ${puppy.name} looks around for sheep to herd`],
    'labrador': [`🏊 ${puppy.name} dreams of swimming`, `🦆 ${puppy.name} sniffs around for ducks`],
    'poodle': [`💇 ${puppy.name} shows off their fluffy coat`, `🎭 ${puppy.name} poses elegantly`],
    'bulldog': [`😤 ${puppy.name} snorts contentedly`, `🛋️ ${puppy.name} looks for a comfy spot`],
    'german-shepherd': [`👮 ${puppy.name} stands at attention`, `🔍 ${puppy.name} sniffs around protectively`],
    'golden-retriever': [`🌞 ${puppy.name} radiates happiness`, `🤝 ${puppy.name} wants to be everyone's friend`],
    'beagle': [`👃 ${puppy.name} follows an interesting scent`, `🎵 ${puppy.name} howls melodically`],
    'rottweiler': [`💪 ${puppy.name} shows their strong stance`, `🏠 ${puppy.name} patrols the area`],
    'siberian-husky': [`🏔️ ${puppy.name} dreams of snow`, `🛷 ${puppy.name} wants to run and run`],
    'dachshund': [`🌭 ${puppy.name} wiggles their long body`, `🕳️ ${puppy.name} looks for something to dig`]
  };
  
  const allResponses = [...responses, ...(breedSpecificResponses[puppy.breed] || [])];
  responseMessage += allResponses[Math.floor(Math.random() * allResponses.length)];
  
  puppy.messages.push(`You: ${message}`);
  puppy.messages.push(`${puppy.name}: ${responseMessage}`);
  
  if (puppy.messages.length > 20) {
    puppy.messages = puppy.messages.slice(-20);
  }
  
  const oldLevel = puppy.level;
  updateLevel(puppy);
  
  if (puppy.level > oldLevel) {
    responseMessage += ` 🎉 Level up! ${puppy.name} is now level ${puppy.level}!`;
    await addCommunityActivity('levelup', puppy.name, 'Someone', `reached level ${puppy.level}`);
  }
  
  puppy.lastActiveTime = Date.now();
  await updatePuppyStats(puppy);
  
  res.json({
    response: responseMessage,
    discoveredSkills: hiddenSkills, // Frontend expects 'discoveredSkills' not 'hiddenSkills'
    puppy: {
      ...puppy,
      age: getPuppyAge(puppy)
    },
    levelUp: puppy.level > oldLevel
  });
});

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export the app for testing
module.exports = app;