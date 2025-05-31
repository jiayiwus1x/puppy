import React, { useEffect, useState } from 'react';
import './App.css';

const DOG_TRICKS = [
  'Sit', 'Stay', 'Roll Over', 'Shake Paw', 'Play Dead', 'Fetch', 'Spin', 'Speak', 'High Five', 'Jump', 'Dance', 'Crawl', 'Back Up', 'Bow', 'Wave', 'Balance Treat', 'Heel', 'Find It', 'Ring Bell', 'Open Door'
];

// Use backend URL from environment variable
const API_URL = process.env.REACT_APP_API_URL;

function ProgressBar({ label, value, max, color }) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-label">{label}</div>
      <div className="progress-bar-outer">
        <div
          className="progress-bar-inner"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
      <div className="progress-bar-value">{value} / {max}</div>
    </div>
  );
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let parts = [];
  if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

function App() {
  const [puppy, setPuppy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [talkLoading, setTalkLoading] = useState(false);
  const [timer, setTimer] = useState('');
  const [lastLevel, setLastLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showSkillAnim, setShowSkillAnim] = useState(false);
  const [lastSkill, setLastSkill] = useState(null);
  const [skillAnimType, setSkillAnimType] = useState('');
  const [showHiddenSkillNotif, setShowHiddenSkillNotif] = useState(false);
  const [hiddenSkillText, setHiddenSkillText] = useState('');
  const [showGameMessage, setShowGameMessage] = useState(false);
  const [gameMessageText, setGameMessageText] = useState('');
  
  // New state for enhanced features
  const [sessionId, setSessionId] = useState(localStorage.getItem('puppySessionId'));
  const [mode, setMode] = useState('personal'); // 'personal' or 'community'
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [puppyName, setPuppyName] = useState('');
  const [selectedBreed, setSelectedBreed] = useState('labrador'); // Default breed
  const [availableBreeds, setAvailableBreeds] = useState([]);
  const [showCommunityList, setShowCommunityList] = useState(false);
  const [communityPuppies, setCommunityPuppies] = useState([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showReclaimDialog, setShowReclaimDialog] = useState(false);
  const [userPuppyInCommunity, setUserPuppyInCommunity] = useState(null);

  // Fetch available breeds
  const fetchBreeds = async () => {
    try {
      const data = await makeApiCall(`${API_URL}/api/breeds`);
      setAvailableBreeds(data.breeds);
    } catch (error) {
      console.error('Failed to fetch breeds:', error);
    }
  };

  // Helper to pick puppy image or emoji based on breed and level
  const getPuppyDisplay = () => {
    if (!puppy) return '🐶';
    
    // Try to use breed-specific image if available
    if (puppy.breed && puppy.breedInfo) {
      const breedImage = `/dogs/${puppy.breedInfo.image}1.png`; // Use first variant
      return (
        <div className="puppy-display">
          <img 
            src={breedImage} 
            alt={puppy.breedInfo.name}
            className="puppy-image"
            onError={(e) => {
              // Fallback to emoji if image fails
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'inline';
            }}
          />
          <span className="puppy-emoji-fallback" style={{ display: 'none' }}>
            {puppy.level >= 4 ? '🐕‍🦺' : puppy.level >= 2 ? '🦮' : '🐶'}
          </span>
        </div>
      );
    }
    
    // Fallback to emoji
    if (puppy.level >= 4) return '🐕‍🦺';
    if (puppy.level >= 2) return '🦮';
    return '🐶';
  };

  // Helper to pick puppy emoji based on level
  const getPuppyEmoji = () => {
    if (!puppy) return '🐶';
    if (puppy.level >= 4) return '🐕‍🦺';
    if (puppy.level >= 2) return '🦮';
    return '🐶';
  };

  // Helper to pick mood color and label
  const getMood = () => {
    if (!puppy) return { color: '#aaa', label: 'Unknown' };
    if (puppy.happiness > 80) return { color: '#4caf50', label: 'Satisfied' };
    if (puppy.happiness > 50) return { color: '#ffe066', label: 'Okay' };
    if (puppy.happiness > 30) return { color: '#ff9800', label: 'Unhappy' };
    return { color: '#f44336', label: 'Sad' };
  };

  // Helper to make API calls with session
  const makeApiCall = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update session if provided
    if (data.sessionId && data.sessionId !== sessionId) {
      setSessionId(data.sessionId);
      localStorage.setItem('puppySessionId', data.sessionId);
    }
    
    return data;
  };

  // Fetch puppy state from backend
  const fetchPuppy = async () => {
    setLoading(true);
    const fullUrl = `${API_URL}/api/puppy?mode=${mode}`;
    console.log('🔍 DEBUG: API_URL =', API_URL);
    console.log('🔍 DEBUG: Full URL =', fullUrl);
    console.log('🔍 DEBUG: Mode =', mode);
    
    try {
      console.log('🔍 DEBUG: Starting fetch...');
      const data = await makeApiCall(fullUrl);
      console.log('🔍 DEBUG: Data received =', data);
      
      // Check if user needs to reclaim their puppy from community
      if (data.needsReclaim && data.userPuppyInCommunity) {
        setUserPuppyInCommunity(data.userPuppyInCommunity);
        setShowReclaimDialog(true);
        setLoading(false);
        return;
      }
      
      setPuppy(data);
      
      // Check if this is a new user who needs to name their puppy
      if (mode === 'personal' && data.name === 'My Puppy' && !isNewUser) {
        setIsNewUser(true);
        setShowNameDialog(true);
      }
    } catch (error) {
      console.error('🔍 DEBUG: Error details =', error);
      console.error('🔍 DEBUG: Error stack =', error.stack);
      setPuppy({ 
        name: 'Error', 
        happiness: 0, 
        energy: 0, 
        skills: [], 
        level: 1, 
        age: 0,
        dead: true,
        error: `Failed to connect to backend: ${error.message}` 
      });
    }
    setLoading(false);
  };

  // Reclaim puppy from community
  const reclaimPuppy = async () => {
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/reclaim`, {
        method: 'POST',
      });
      setPuppy(data);
      setGameMessageText(data.message);
      setShowGameMessage(true);
      setTimeout(() => setShowGameMessage(false), 4000);
      setShowReclaimDialog(false);
      setUserPuppyInCommunity(null);
    } catch (error) {
      console.error('Failed to reclaim puppy:', error);
      alert(`Failed to reclaim puppy: ${error.message}`);
    }
  };

  // Create new puppy instead of reclaiming
  const createNewPuppy = () => {
    setShowReclaimDialog(false);
    setUserPuppyInCommunity(null);
    setIsNewUser(true);
    setShowNameDialog(true);
  };

  // Create/rename puppy
  const createPuppy = async (name, breedId = selectedBreed) => {
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/create`, {
        method: 'POST',
        body: JSON.stringify({ name, breedId }),
      });
      setPuppy(data);
      setShowNameDialog(false);
      setIsNewUser(false);
    } catch (error) {
      console.error('Failed to create puppy:', error);
      alert(`Failed to create puppy: ${error.message}`);
    }
  };

  // Share puppy to community
  const sharePuppy = async () => {
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/share`, {
        method: 'POST',
      });
      setGameMessageText(data.message);
      setShowGameMessage(true);
      setTimeout(() => setShowGameMessage(false), 4000);
      // Switch to community mode to see shared puppy
      setMode('community');
    } catch (error) {
      console.error('Failed to share puppy:', error);
      alert(`Failed to share puppy: ${error.message}`);
    }
  };

  // Fetch community puppies
  const fetchCommunityPuppies = async () => {
    try {
      const data = await makeApiCall(`${API_URL}/api/community`);
      setCommunityPuppies(data);
      setShowCommunityList(true);
    } catch (error) {
      console.error('Failed to fetch community puppies:', error);
      alert(`Failed to fetch community puppies: ${error.message}`);
    }
  };

  // Adopt community puppy
  const adoptPuppy = async (puppyId) => {
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/adopt`, {
        method: 'POST',
        body: JSON.stringify({ puppyId }),
      });
      setPuppy(data);
      setGameMessageText(data.message);
      setShowGameMessage(true);
      setTimeout(() => setShowGameMessage(false), 4000);
      setShowCommunityList(false);
      setMode('personal');
    } catch (error) {
      console.error('Failed to adopt puppy:', error);
      alert(`Failed to adopt puppy: ${error.message}`);
    }
  };

  // Switch mode and fetch puppy
  const switchMode = async (newMode) => {
    setMode(newMode);
  };

  useEffect(() => {
    fetchPuppy();
  }, [mode]);

  // Live timer for puppy age (matching backend calculation)
  useEffect(() => {
    if (!puppy || !puppy.birthTime) return;
    const birthTime = Number(puppy.birthTime);
    const interval = setInterval(() => {
      const now = Date.now();
      const msPerDay = 1000 * 60; // 1 minute = 1 day (same as backend)
      const ageInDays = ((now - birthTime) / msPerDay).toFixed(1);
      setTimer(`${ageInDays} days`);
    }, 1000);
    
    // Set initial value
    const now = Date.now();
    const msPerDay = 1000 * 60; // 1 minute = 1 day (same as backend)
    const ageInDays = ((now - birthTime) / msPerDay).toFixed(1);
    setTimer(`${ageInDays} days`);
    
    return () => clearInterval(interval);
  }, [puppy]);

  // Watch for level up
  useEffect(() => {
    if (!puppy) return;
    if (puppy.level > lastLevel) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 2000);
    }
    setLastLevel(puppy.level);
  }, [puppy, lastLevel]);

  // Watch for new skill learned
  useEffect(() => {
    if (!puppy || !puppy.skills) return;
    if (lastSkill === null) {
      setLastSkill(puppy.skills[puppy.skills.length - 1]);
      return;
    }
    if (puppy.skills.length > 0 && puppy.skills[puppy.skills.length - 1] !== lastSkill) {
      const newSkill = puppy.skills[puppy.skills.length - 1];
      setLastSkill(newSkill);
      setShowSkillAnim(true);
      // Choose animation type
      if (newSkill.toLowerCase().includes('spin')) setSkillAnimType('spin');
      else if (newSkill.toLowerCase().includes('jump')) setSkillAnimType('jump');
      else setSkillAnimType('bounce');
      setTimeout(() => setShowSkillAnim(false), 2000);
    }
  }, [puppy, lastSkill]);

  // Send action to backend
  const handleAction = async (action) => {
    if (action === 'talk') {
      setShowDialog(true);
      return;
    }
    setActionLoading(true);
    setAnimate(true);
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/action?mode=${mode}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setPuppy(data);
      
      // Show feedback message if action was blocked or has a message
      if (data.message) {
        setGameMessageText(data.message);
        setShowGameMessage(true);
        setTimeout(() => setShowGameMessage(false), 3000);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
      alert(`Failed to perform action: ${error.message}`);
    }
    setActionLoading(false);
    setTimeout(() => setAnimate(false), 700);
  };

  // Handle sending a message in the dialog
  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;
    setTalkLoading(true);
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/action?mode=${mode}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'talk', message: userMessage }),
      });
      setPuppy(data.puppy || data); // fallback for old response
      
      // Handle hidden skills
      if (data.newSkills && data.newSkills.length > 0) {
        setHiddenSkillText(data.newSkills.join(', '));
        setShowHiddenSkillNotif(true);
        setTimeout(() => setShowHiddenSkillNotif(false), 4000);
      }
      
      setConversation((prev) => [
        ...prev,
        { from: 'user', text: userMessage },
        { from: 'puppy', text: data.reply || 'Woof! 🐾' },
      ]);
      setUserMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setConversation((prev) => [
        ...prev,
        { from: 'user', text: userMessage },
        { from: 'puppy', text: `Sorry, I couldn't understand you right now. Error: ${error.message}` },
      ]);
      setUserMessage('');
    }
    setTalkLoading(false);
  };

  // Effect to fetch breeds on component mount
  useEffect(() => {
    fetchBreeds();
  }, []);

  if (loading) return <div className="App">Loading puppy...</div>;

  if (puppy?.error) {
    return (
      <div className="App">
        <div className="puppy-card">
          <header className="App-header">
            <h1>🐶 Raise Your LLM Puppy!</h1>
            <div style={{ color: 'red', padding: '20px', textAlign: 'center' }}>
              <h2>❌ Connection Error</h2>
              <p>{puppy.error}</p>
              <p>API URL: {API_URL}</p>
              <button onClick={fetchPuppy} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px' }}>
                🔄 Retry Connection
              </button>
            </div>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="puppy-card">
        <header className="App-header">
          <h1>🐶 Raise Your LLM Puppy!</h1>
          
          {/* Mode Switcher */}
          <div className="mode-switcher">
            <button 
              className={mode === 'personal' ? 'active' : ''}
              onClick={() => switchMode('personal')}
            >
              👤 My Puppy
            </button>
            <button 
              className={mode === 'community' ? 'active' : ''}
              onClick={() => switchMode('community')}
            >
              🏘️ Community
            </button>
          </div>
          
          <div className="puppy-emoji-mood-row">
            <div className={`puppy-emoji-container ${animate ? 'bounce' : ''} ${showSkillAnim ? skillAnimType : ''}`} style={{ fontSize: '5rem', transition: 'all 0.2s' }}>
              {showSkillAnim && lastSkill && (
                <div className="puppy-skill-anim">{lastSkill}!</div>
              )}
              <span className="puppy-emoji-base">{getPuppyDisplay()}</span>
            </div>
            <div className="puppy-mood-bar">
              <div className="puppy-mood-label">{getMood().label}</div>
              <div className="puppy-mood-outer">
                <div className="puppy-mood-inner" style={{ width: `${puppy.happiness}%`, background: getMood().color }} />
              </div>
              <div className="puppy-mood-value">{puppy.happiness} / 100</div>
            </div>
          </div>
          
          {/* Puppy Name */}
          <div className="puppy-name">
            {puppy.name} {mode === 'community' && '(Community)'}
          </div>
          
          {/* Breed Information */}
          {puppy.breedInfo && (
            <div className="breed-info-display">
              <div className="breed-name-display">🐕 {puppy.breedInfo.name}</div>
              <div className="breed-specialties-display">
                {puppy.breedInfo.specialties.map(specialty => (
                  <span key={specialty} className={`specialty-badge ${specialty}`}>
                    {specialty === 'happiness' ? '😊' : 
                     specialty === 'energy' ? '⚡' : 
                     specialty === 'training' ? '🧠' : 
                     specialty === 'skills' ? '✨' : 
                     specialty === 'learning' ? '📚' : '🌟'} {specialty}
                  </span>
                ))}
              </div>
              <div className="breed-ability-display">{puppy.breedInfo.description}</div>
            </div>
          )}
          
          <div className="puppy-level">Level {puppy.level}</div>
          {showLevelUp && <div className="puppy-levelup">🎉 Level Up! 🎉</div>}
          {showHiddenSkillNotif && (
            <div className="puppy-hidden-skill-notif">
              ✨ Hidden Skill Unlocked: {hiddenSkillText} ✨
            </div>
          )}
          {showGameMessage && (
            <div className="puppy-game-message-notif">
              {gameMessageText}
            </div>
          )}
          <div className="puppy-timer">Puppy age: {timer}</div>
          <div className="puppy-stats">
            <ProgressBar label="Age" value={parseFloat(puppy.age)} max={10} color="#a3d977" />
            <ProgressBar label="Happiness" value={puppy.happiness} max={100} color="#ffe066" />
            <ProgressBar label="Energy" value={puppy.energy} max={100} color="#4caf50" />
            <ProgressBar label="Skills" value={puppy.skills.length} max={DOG_TRICKS.length} color="#b388ff" />
            <div className="skills-section">
              <div className="progress-bar-label">Skills</div>
              <div className="skills-badges">
                {puppy.skills.length > 0 ? (
                  puppy.skills.map((skill, idx) => {
                    const isHidden = skill.includes('🎵') || skill.includes('🕺') || skill.includes('🎭') || 
                                   skill.includes('🧠') || skill.includes('🦸') || skill.includes('🎨') || 
                                   skill.includes('👑') || skill.includes('🚀') || skill.includes('🎪') || 
                                   skill.includes('🧙') || skill.includes('💖') || skill.includes('🤖') || 
                                   skill.includes('🏴‍☠️') || skill.includes('🥷') || skill.includes('🎯');
                    return (
                      <span 
                        className={`skill-badge ${isHidden ? 'hidden-skill' : ''}`} 
                        key={idx}
                        title={isHidden ? 'Hidden Skill unlocked through chat!' : 'Regular skill'}
                      >
                        {skill}
                      </span>
                    );
                  })
                ) : (
                  <span className="skill-badge none">None yet!</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="puppy-actions">
            <button 
              onClick={() => handleAction('feed')} 
              disabled={actionLoading}
              className={puppy.energy > 90 ? 'not-needed' : puppy.energy > 70 ? 'less-effective' : ''}
              title={
                puppy.energy > 90 ? 'Not hungry at all' : 
                puppy.energy > 70 ? 'Not very hungry (less effective)' : 
                'Feed your puppy'
              }
            >
              🍖 Feed
            </button>
            <button 
              onClick={() => handleAction('play')} 
              disabled={actionLoading || puppy.energy <= 10}
              className={puppy.energy <= 10 ? 'blocked' : ''}
              title={puppy.energy <= 10 ? 'Too tired to play! Feed first.' : 'Play with your puppy'}
            >
              🎾 Play
            </button>
            <button 
              onClick={() => handleAction('train')} 
              disabled={actionLoading || puppy.energy <= 20 || puppy.happiness < 20}
              className={puppy.energy <= 20 || puppy.happiness < 20 ? 'blocked' : ''}
              title={
                puppy.energy <= 20 ? 'Too tired to focus! Feed first.' : 
                puppy.happiness < 20 ? 'Too sad to focus! Play or talk first.' :
                'Train your puppy'
              }
            >
              🧠 Train
            </button>
            <button 
              onClick={() => handleAction('talk')} 
              disabled={actionLoading}
              title="Chat with your puppy"
            >
              💬 Talk
            </button>
          </div>
          
          {/* Mode-specific buttons */}
          {mode === 'personal' && (
            <div className="special-actions">
              <button 
                onClick={sharePuppy}
                disabled={actionLoading}
                className="share-button"
                title="Share your puppy with the community when you're away"
              >
                🤝 Share to Community
              </button>
            </div>
          )}
          
          {mode === 'community' && (
            <div className="special-actions">
              <button 
                onClick={fetchCommunityPuppies}
                disabled={actionLoading}
                className="community-button"
                title="See all community puppies that need care"
              >
                🏘️ View All Community Puppies
              </button>
            </div>
          )}
          
          {actionLoading && <div>Interacting with puppy...</div>}
        </header>
      </div>
      
      {/* Naming Dialog */}
      {showNameDialog && (
        <div className="puppy-dialog-backdrop" onClick={() => setShowNameDialog(false)}>
          <div className="puppy-dialog breed-selection-dialog" onClick={e => e.stopPropagation()}>
            <h2>🎉 Welcome! Choose Your Puppy!</h2>
            <p>Pick a name and breed for your new companion:</p>
            
            <div className="puppy-dialog-inputs">
              <input
                type="text"
                value={puppyName}
                onChange={e => setPuppyName(e.target.value)}
                placeholder="Enter puppy name..."
                onKeyDown={e => { if (e.key === 'Enter' && puppyName.trim()) createPuppy(puppyName); }}
                autoFocus
              />
            </div>
            
            <div className="breed-selection">
              <h3>🐕 Choose a Breed:</h3>
              <div className="breed-grid">
                {availableBreeds.map(breed => (
                  <div 
                    key={breed.id} 
                    className={`breed-card ${selectedBreed === breed.id ? 'selected' : ''}`}
                    onClick={() => setSelectedBreed(breed.id)}
                  >
                    <div className="breed-image-container">
                      <img 
                        src={`/dogs/${breed.image}1.png`} 
                        alt={breed.name}
                        className="breed-preview-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="breed-emoji-fallback" style={{ display: 'none' }}>🐶</div>
                    </div>
                    <h4>{breed.name}</h4>
                    <p className="breed-description">{breed.description}</p>
                    <div className="breed-specialties">
                      {breed.specialties.map(specialty => (
                        <span key={specialty} className={`specialty-tag ${specialty}`}>
                          {specialty === 'happiness' ? '😊' : 
                           specialty === 'energy' ? '⚡' : 
                           specialty === 'training' ? '🧠' : 
                           specialty === 'skills' ? '✨' : 
                           specialty === 'learning' ? '📚' : '🌟'} {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="dialog-actions">
              <button 
                onClick={() => createPuppy(puppyName)} 
                disabled={!puppyName.trim()}
                className="create-puppy-button"
              >
                🐕 Create {selectedBreed ? availableBreeds.find(b => b.id === selectedBreed)?.name : 'Puppy'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Community Puppies List */}
      {showCommunityList && (
        <div className="puppy-dialog-backdrop" onClick={() => setShowCommunityList(false)}>
          <div className="puppy-dialog community-list" onClick={e => e.stopPropagation()}>
            <h2>🏘️ Community Puppies Need Care!</h2>
            <div className="community-puppies">
              {communityPuppies.length === 0 ? (
                <p>No community puppies right now. Be the first to share!</p>
              ) : (
                communityPuppies.map(communityPuppy => (
                  <div key={communityPuppy.id} className="community-puppy-card">
                    <div className="community-puppy-header">
                      <h3>{communityPuppy.name}</h3>
                      <span className="community-puppy-age">Age: {communityPuppy.age}</span>
                    </div>
                    <div className="community-puppy-stats">
                      <span>😊 {communityPuppy.happiness}%</span>
                      <span>⚡ {communityPuppy.energy}%</span>
                      <span>🎓 {communityPuppy.skills} skills</span>
                      <span>📈 Lv.{communityPuppy.level}</span>
                    </div>
                    <div className="community-puppy-actions">
                      <button 
                        onClick={() => adoptPuppy(communityPuppy.id)}
                        className="adopt-button"
                        disabled={communityPuppy.dead}
                      >
                        {communityPuppy.dead ? '💀 Needs Revival' : '💖 Adopt'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowCommunityList(false)} style={{ marginTop: '1rem' }}>
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Dialog for talking to the puppy */}
      {showDialog && (
        <div className="puppy-dialog-backdrop" onClick={() => setShowDialog(false)}>
          <div className="puppy-dialog" onClick={e => e.stopPropagation()}>
            <h2>💬 Talk to {puppy.name}!</h2>
            <div className="puppy-conversation">
              {conversation.length === 0 && <div className="puppy-message puppy">Woof! 🐾</div>}
              {conversation.map((msg, idx) => (
                <div key={idx} className={`puppy-message ${msg.from}`}>{msg.text}</div>
              ))}
            </div>
            <div className="puppy-dialog-inputs">
              <input
                type="text"
                value={userMessage}
                onChange={e => setUserMessage(e.target.value)}
                placeholder="Say something..."
                onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                disabled={talkLoading}
              />
              <button onClick={handleSendMessage} disabled={talkLoading || !userMessage.trim()}>
                Send
              </button>
              <button onClick={() => setShowDialog(false)} style={{ marginLeft: 8 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reclaim Dialog */}
      {showReclaimDialog && userPuppyInCommunity && (
        <div className="puppy-dialog-backdrop">
          <div className="puppy-dialog" onClick={e => e.stopPropagation()}>
            <h2>🏠 Welcome Back!</h2>
            <p>Your puppy <strong>{userPuppyInCommunity.name}</strong> is currently in the community being cared for by others.</p>
            <div className="reclaim-puppy-preview">
              <h3>📊 {userPuppyInCommunity.name}'s Status:</h3>
              <div className="reclaim-stats">
                <span>😊 Happiness: {userPuppyInCommunity.happiness}%</span>
                <span>⚡ Energy: {userPuppyInCommunity.energy}%</span>
                <span>🎓 Skills: {userPuppyInCommunity.skills}</span>
                <span>📈 Level: {userPuppyInCommunity.level}</span>
                <span>🎂 Age: {userPuppyInCommunity.age} days</span>
              </div>
            </div>
            <p>Would you like to bring <strong>{userPuppyInCommunity.name}</strong> back home, or start fresh with a new puppy?</p>
            <div className="reclaim-dialog-actions">
              <button 
                onClick={reclaimPuppy}
                className="reclaim-button"
              >
                🏠 Bring {userPuppyInCommunity.name} Home
              </button>
              <button 
                onClick={createNewPuppy}
                className="new-puppy-button"
              >
                🆕 Start Fresh with New Puppy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
