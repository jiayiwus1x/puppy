import React, { useEffect, useState } from 'react';
import './App.css';

// =============================================================================
// CONSTANTS
// =============================================================================

const DOG_TRICKS = [
  'Sit', 'Stay', 'Roll Over', 'Shake Paw', 'Play Dead', 'Fetch', 'Spin', 'Speak', 
  'High Five', 'Jump', 'Dance', 'Crawl', 'Back Up', 'Bow', 'Wave', 'Balance Treat', 
  'Heel', 'Find It', 'Ring Bell', 'Open Door'
];

const FALLBACK_API_URL = 'https://puppy-backend-bce713c62e5e.herokuapp.com';
const API_URL = process.env.REACT_APP_API_URL || FALLBACK_API_URL;

// =============================================================================
// COMPONENTS
// =============================================================================

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

// =============================================================================
// MAIN APP
// =============================================================================

function App() {
  // Core state
  const [puppy, setPuppy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Session & Mode
  const [sessionId, setSessionId] = useState(localStorage.getItem('puppySessionId'));
  const [mode, setMode] = useState('personal');
  
  // UI state
  const [showDialog, setShowDialog] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showCommunityList, setShowCommunityList] = useState(false);
  const [showReclaimDialog, setShowReclaimDialog] = useState(false);
  
  // Animation & notifications
  const [timer, setTimer] = useState('');
  const [lastLevel, setLastLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showSkillAnim, setShowSkillAnim] = useState(false);
  const [lastSkill, setLastSkill] = useState(null);
  const [showHiddenSkillNotif, setShowHiddenSkillNotif] = useState(false);
  const [hiddenSkillText, setHiddenSkillText] = useState('');
  const [showGameMessage, setShowGameMessage] = useState(false);
  const [gameMessageText, setGameMessageText] = useState('');
  const [showDeathWarning, setShowDeathWarning] = useState(false);
  const [showCriticalWarning, setShowCriticalWarning] = useState(false);
  const [lastWarningEnergy, setLastWarningEnergy] = useState(100);
  
  // Dialog state
  const [userMessage, setUserMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [talkLoading, setTalkLoading] = useState(false);
  const [puppyName, setPuppyName] = useState('');
  const [selectedBreed, setSelectedBreed] = useState('labrador');
  
  // Data
  const [availableBreeds, setAvailableBreeds] = useState([]);
  const [communityPuppies, setCommunityPuppies] = useState([]);
  const [userPuppyInCommunity, setUserPuppyInCommunity] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Community state
  const [communityLeaderboards, setCommunityLeaderboards] = useState(null);
  const [communityActivity, setCommunityActivity] = useState([]);
  const [communityStats, setCommunityStats] = useState(null);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'leaderboards', 'activity', 'stats'

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const getPuppyDisplay = () => {
    if (!puppy) return '🐶';
    
    if (puppy.breed && puppy.breedInfo) {
      let imageVariant = 1;
      if (puppy.level >= 6) imageVariant = 4;
      else if (puppy.level >= 4) imageVariant = 3;
      else if (puppy.level >= 2) imageVariant = 2;
      
      const breedImage = `/dogs/${puppy.breedInfo.image}${imageVariant}.png`;
      return (
        <div className="puppy-display">
          <img 
            src={breedImage} 
            alt={`${puppy.breedInfo.name} (Level ${puppy.level})`}
            className="puppy-image"
            onError={(e) => {
              // Try previous image variants before falling back to emoji
              const currentSrc = e.target.src;
              const currentVariant = parseInt(currentSrc.match(/(\d+)\.png$/)?.[1] || '1');
              
              if (currentVariant > 1) {
                // Try the previous variant
                const fallbackImage = `/dogs/${puppy.breedInfo.image}${currentVariant - 1}.png`;
                if (e.target.src !== fallbackImage) {
                  e.target.src = fallbackImage;
                  return;
                }
              }
              
              // All image variants failed, show emoji fallback
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
    
    if (puppy.level >= 4) return '🐕‍🦺';
    if (puppy.level >= 2) return '🦮';
    return '🐶';
  };

  const getMood = () => {
    if (!puppy) return { color: '#aaa', label: 'Unknown' };
    
    // Death warnings take priority
    if (puppy.dead) return { color: '#ff0000', label: '💀 Dead' };
    if (puppy.energy <= 5) return { color: '#ff0000', label: '🚨 Dying!' };
    if (puppy.energy <= 15) return { color: '#ff4444', label: '⚠️ Critical' };
    
    // Normal mood based on happiness
    if (puppy.happiness > 80) return { color: '#4caf50', label: 'Satisfied' };
    if (puppy.happiness > 50) return { color: '#ffe066', label: 'Okay' };
    if (puppy.happiness > 30) return { color: '#ff9800', label: 'Unhappy' };
    return { color: '#f44336', label: 'Sad' };
  };

  const makeApiCall = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.sessionId && data.sessionId !== sessionId) {
      setSessionId(data.sessionId);
      localStorage.setItem('puppySessionId', data.sessionId);
    }
    
    return data;
  };

  // =============================================================================
  // API FUNCTIONS
  // =============================================================================

  const fetchBreeds = async () => {
    try {
      const data = await makeApiCall(`${API_URL}/api/breeds`);
      setAvailableBreeds(data.breeds);
    } catch (error) {
      console.error('Failed to fetch breeds:', error);
    }
  };

  const fetchPuppy = async () => {
    console.log('Fetching puppy data for mode:', mode);
    setLoading(true);
    
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy?mode=${mode}`);
      
      if (data.needsReclaim && data.userPuppyInCommunity) {
        console.log('User has puppy in community, showing reclaim dialog');
        setUserPuppyInCommunity(data.userPuppyInCommunity);
        setShowReclaimDialog(true);
        setLoading(false);
        return;
      }
      
      if (data.needsNewPuppy) {
        console.log('New user detected, showing name dialog');
        setIsNewUser(true);
        setShowNameDialog(true);
        setLoading(false);
        return;
      }
      
      console.log('Puppy data loaded successfully');
      setPuppy(data);
    } catch (error) {
      console.error('Failed to fetch puppy:', error);
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
    console.log('Reclaiming puppy from community');
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/reclaim`, { method: 'POST' });
      setPuppy(data);
      setShowReclaimDialog(false);
      setUserPuppyInCommunity(null);
      setMode('personal');
      console.log('Puppy reclaimed successfully');
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

  // Stay in community mode
  const stayInCommunityMode = () => {
    setShowReclaimDialog(false);
    setUserPuppyInCommunity(null);
    setMode('community');
  };

  // Create/rename puppy
  const createPuppy = async (name, breedId = selectedBreed) => {
    console.log('Creating new puppy:', name, 'breed:', breedId);
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/create`, {
        method: 'POST',
        body: JSON.stringify({ name, breedId }),
      });
      setPuppy(data);
      setShowNameDialog(false);
      setIsNewUser(false);
      console.log('Puppy created successfully');
    } catch (error) {
      console.error('Failed to create puppy:', error);
      alert(`Failed to create puppy: ${error.message}`);
    }
  };

  // Share puppy to community
  const sharePuppy = async () => {
    if (!window.confirm(`Are you sure you want to share ${puppy.name} with the community? They'll be available for others to adopt or care for.`)) {
      return;
    }
    
    console.log('Sharing puppy to community');
    try {
      await makeApiCall(`${API_URL}/api/puppy/share`, { method: 'POST' });
      alert(`${puppy.name} has been shared with the community!`);
      setPuppy(null);
      fetchPuppy();
    } catch (error) {
      console.error('Failed to share puppy:', error);
      alert(`Failed to share puppy: ${error.message}`);
    }
  };

  // Fetch community puppies
  const fetchCommunityPuppies = async () => {
    try {
      const response = await fetch(`${API_URL}/api/community`, {
        headers: { 'X-Session-Id': sessionId }
      });
      const data = await response.json();
      setCommunityPuppies(data);
    } catch (error) {
      console.error('Error fetching community puppies:', error);
    }
  };

  // Adopt community puppy
  const adoptPuppy = async (puppyId) => {
    console.log('Adopting community puppy:', puppyId);
    try {
      const result = await makeApiCall(`${API_URL}/api/puppy/adopt`, {
        method: 'POST',
        body: JSON.stringify({ puppyId }),
      });
      
      setPuppy(result);
      setMode('personal');
      setGameMessageText(result.message || `You adopted ${result.name}!`);
      setShowGameMessage(true);
      refreshCommunityData();
      console.log('Puppy adopted successfully');
    } catch (error) {
      console.error('Failed to adopt puppy:', error);
      alert(`Failed to adopt puppy: ${error.message}`);
    }
  };

  const careTakePuppy = async (puppyId) => {
    try {
      // Switch to community mode and care for the specific puppy
      setMode('community');
      
      // Perform a care action (like feeding) for the community puppy
      const result = await makeApiCall(`${API_URL}/api/action`, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'feed', 
          mode: 'community',
          puppyId: puppyId 
        }),
      });
      
      setGameMessageText(result.message || 'You helped take care of this puppy!');
      setShowGameMessage(true);
      refreshCommunityData();
      
      // Show the puppy we just cared for
      setPuppy(result);
    } catch (error) {
      console.error('Failed to care for puppy:', error);
      alert(`Failed to care for puppy: ${error.message}`);
    }
  };

  // Switch mode and fetch puppy
  const switchMode = async (newMode) => {
    console.log('Switching mode from', mode, 'to', newMode);
    setMode(newMode);
    setLoading(true);
    
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy?mode=${newMode}`);
    setPuppy(data);
    } catch (error) {
      console.error('Failed to switch mode:', error);
      setPuppy(null);
    }
    setLoading(false);
  };

  // Send action to backend
  const handleAction = async (action) => {
    if (action === 'talk') {
      setShowDialog(true);
      return;
    }
    
    console.log('Performing action:', action);
    setActionLoading(true);
    
    try {
      const result = await makeApiCall(`${API_URL}/api/action`, {
        method: 'POST',
        body: JSON.stringify({ action, message: userMessage, mode }),
      });

      setPuppy(result);
      setGameMessageText(result.message || '');
      setShowGameMessage(true);
      
      // Refresh community data if in community mode to show activity updates
      if (mode === 'community') {
        setTimeout(() => {
          fetchCommunityActivity();
          fetchCommunityStats();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
      alert(`Failed to perform action: ${error.message}`);
    }
    setActionLoading(false);
  };

  // Handle sending a message in the dialog
  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;
    
    const newMessage = { sender: 'user', text: userMessage };
    setConversation(prev => [...prev, newMessage]);
    
    setTalkLoading(true);
    
    try {
      const data = await makeApiCall(`${API_URL}/api/puppy/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: userMessage, mode }),
      });
      
      setPuppy(data);
      
      if (data.discoveredSkills && data.discoveredSkills.length > 0) {
        console.log('Hidden skills discovered:', data.discoveredSkills);
        setHiddenSkillText(`🎉 Discovered: ${data.discoveredSkills.join(', ')}!`);
        setShowHiddenSkillNotif(true);
        setTimeout(() => setShowHiddenSkillNotif(false), 3000);
      }
      
      const puppyResponse = { 
        sender: 'puppy', 
        text: data.messages && data.messages.length > 0 ? 
          data.messages[data.messages.length - 1] : 
          `🐕 ${data.name} wags their tail!` 
      };
      setConversation(prev => [...prev, puppyResponse]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(`Failed to send message: ${error.message}`);
    }
    
    setUserMessage('');
    setTalkLoading(false);
  };

  const fetchCommunityLeaderboards = async () => {
    try {
      const response = await fetch(`${API_URL}/api/community/leaderboards`);
      const data = await response.json();
      setCommunityLeaderboards(data);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    }
  };

  const fetchCommunityActivity = async () => {
    try {
      const response = await fetch(`${API_URL}/api/community/activity?limit=30`);
      const data = await response.json();
      setCommunityActivity(data);
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const fetchCommunityStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/community/stats`);
      const data = await response.json();
      setCommunityStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Refresh data for specific tabs
    if (tab === 'leaderboards' && !communityLeaderboards) {
      fetchCommunityLeaderboards();
    } else if (tab === 'activity' && communityActivity.length === 0) {
      fetchCommunityActivity();
    } else if (tab === 'stats' && !communityStats) {
      fetchCommunityStats();
    } else if (tab === 'browse') {
      fetchCommunityPuppies();
    }
  };

  const refreshCommunityData = () => {
    fetchCommunityPuppies();
    fetchCommunityLeaderboards();
    fetchCommunityActivity();
    fetchCommunityStats();
  };

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    fetchBreeds(); // Always fetch breeds on component mount
    
    // Always fetch puppy for main interface
    fetchPuppy();
    
    if (mode === 'community') {
      fetchCommunityPuppies();
      fetchCommunityLeaderboards();
      fetchCommunityActivity();
      fetchCommunityStats();
    }
  }, [mode, sessionId]);

  useEffect(() => {
    if (!puppy || !puppy.birthTime) return;
    const birthTime = Number(puppy.birthTime);
    const interval = setInterval(() => {
      const now = Date.now();
      const msPerDay = 1000 * 60 * 5;
      const ageInDays = ((now - birthTime) / msPerDay).toFixed(1);
      setTimer(`${ageInDays} days`);
    }, 1000);
    
    const now = Date.now();
    const msPerDay = 1000 * 60 * 5;
    const ageInDays = ((now - birthTime) / msPerDay).toFixed(1);
    setTimer(`${ageInDays} days`);
    
    return () => clearInterval(interval);
  }, [puppy]);

  useEffect(() => {
    if (!puppy) return;
    
    if (puppy.level > lastLevel) {
      const levelDiff = puppy.level - lastLevel;
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
    setLastLevel(puppy.level);
  }, [puppy?.level, lastLevel]);

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
      setTimeout(() => setShowSkillAnim(false), 2000);
    }
  }, [puppy, lastSkill]);

  // Monitor puppy energy for death warnings
  useEffect(() => {
    if (!puppy || mode === 'community') return;
    
    const energy = puppy.energy || 0;
    
    // Death notification
    if (puppy.dead && !showDeathWarning) {
      setGameMessageText(`💀 ${puppy.name} has died! Feed them to revive. RIP little buddy... 😢`);
      setShowGameMessage(true);
      setTimeout(() => setShowGameMessage(false), 10000);
      setLastWarningEnergy(0);
      return;
    }
    
    // Death warning (energy ≤ 5)
    if (energy <= 5 && energy > 0 && lastWarningEnergy > 5) {
      setShowDeathWarning(true);
      setGameMessageText(`🚨 URGENT: ${puppy.name} is about to die! Feed immediately! (Energy: ${energy})`);
      setShowGameMessage(true);
      setTimeout(() => {
        setShowDeathWarning(false);
        setShowGameMessage(false);
      }, 8000);
    }
    // Critical warning (energy ≤ 15)
    else if (energy <= 15 && energy > 5 && lastWarningEnergy > 15) {
      setShowCriticalWarning(true);
      setGameMessageText(`⚠️ WARNING: ${puppy.name} is getting very hungry! (Energy: ${energy})`);
      setShowGameMessage(true);
      setTimeout(() => {
        setShowCriticalWarning(false);
        setShowGameMessage(false);
      }, 5000);
    }
    
    setLastWarningEnergy(energy);
  }, [puppy?.energy, puppy?.dead, lastWarningEnergy, puppy?.name, mode, showDeathWarning]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return <div className="loading">Loading puppy data... 🐶</div>;
  }

  return (
    <div className="app">
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
            <div className={`puppy-emoji-container ${showSkillAnim ? 'skill-anim' : ''} ${puppy?.energy <= 15 && !puppy?.dead ? 'critical-condition' : ''} ${puppy?.energy <= 5 && !puppy?.dead ? 'dying-condition' : ''}`} style={{ fontSize: '5rem', transition: 'all 0.2s' }}>
              {showSkillAnim && lastSkill && (
                <div className="puppy-skill-anim">{lastSkill}!</div>
              )}
              {puppy?.energy <= 15 && !puppy?.dead && (
                <div className="puppy-warning-indicator">
                  {puppy.energy <= 5 ? '🚨' : '⚠️'}
                </div>
              )}
              <span className="puppy-emoji-base">{getPuppyDisplay()}</span>
            </div>
          </div>
          
          <div className="puppy-mood-bar">
            <div className="puppy-mood-label">{getMood().label}</div>
            <div className="puppy-mood-outer">
              <div className="puppy-mood-inner" style={{ width: `${puppy?.happiness || 0}%`, background: getMood().color }} />
            </div>
            <div className="puppy-mood-value">{puppy?.happiness || 0} / 100</div>
          </div>
          
          {/* Puppy Name */}
          <div className="puppy-name">
            {puppy?.name || 'Loading...'} {mode === 'community' && '(Community)'}
          </div>
          
          {/* Breed Information */}
          {puppy?.breedInfo && (
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
          
          <div className="puppy-level">Level {puppy?.level || 1}</div>
          {showLevelUp && (
            <div className="puppy-levelup">🎉 Level Up! 🎉</div>
          )}
          {showHiddenSkillNotif && (
            <div className="puppy-hidden-skill-notif">
              ✨ Hidden Skill Unlocked: {hiddenSkillText} ✨
            </div>
          )}
          {showGameMessage && (
            <div className={`puppy-game-message-notif ${showDeathWarning ? 'death-warning' : showCriticalWarning ? 'critical-warning' : ''}`}>
              {gameMessageText}
            </div>
          )}
          <div className="puppy-timer">Puppy age: {timer}</div>
          
          {/* Action Buttons - Below the age timer */}
          <div className="puppy-actions">
            <button 
              onClick={() => handleAction('feed')} 
              disabled={actionLoading || !puppy}
              className={!puppy ? 'blocked' : puppy.energy > 90 ? 'not-needed' : puppy.energy > 70 ? 'less-effective' : ''}
              title={
                !puppy ? 'Loading puppy data...' :
                puppy.energy > 90 ? 'Already full!' : 
                puppy.energy > 70 ? 'Not very hungry (less effective)' : 
                'Feed your puppy'
              }
            >
              🍖 Feed
            </button>
            <button 
              onClick={() => handleAction('play')} 
              disabled={actionLoading || !puppy || puppy.energy <= 10}
              className={!puppy || puppy.energy <= 10 ? 'blocked' : ''}
              title={!puppy ? 'Loading puppy data...' : puppy.energy <= 10 ? 'Too tired to play! Feed first.' : 'Play with your puppy'}
            >
              🎾 Play
            </button>
            {mode === 'personal' && (
              <>
                <button 
                  onClick={() => handleAction('train')} 
                  disabled={actionLoading || !puppy || puppy.energy <= 20 || puppy.happiness < 20}
                  className={!puppy || puppy.energy <= 20 || puppy.happiness < 20 ? 'blocked' : ''}
                  title={
                    !puppy ? 'Loading puppy data...' :
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
              </>
            )}
          </div>
          
          <div className="puppy-stats">
            {/* Custom Age Progress Bar with years as unit */}
            <div className="progress-bar-container">
              <div className="progress-bar-label">Age</div>
              <div className="progress-bar-outer">
                <div
                  className="progress-bar-inner"
                  style={{ width: `${((parseFloat(puppy?.age || 0) / 365) / 10) * 100}%`, background: "#a3d977" }}
                />
              </div>
              <div className="progress-bar-value">{(parseFloat(puppy?.age || 0) / 365).toFixed(2)} / 10.00 years</div>
            </div>
            <ProgressBar label="Happiness" value={puppy?.happiness || 0} max={100} color="#ffe066" />
            <ProgressBar 
              label="Energy" 
              value={puppy?.energy || 0} 
              max={100} 
              color={
                !puppy ? "#4caf50" :
                puppy.energy <= 5 ? "#ff0000" :
                puppy.energy <= 15 ? "#ff4444" :
                puppy.energy <= 30 ? "#ff9800" :
                "#4caf50"
              } 
            />
            <ProgressBar label="Skills" value={puppy?.skills?.length || 0} max={DOG_TRICKS.length} color="#b388ff" />
            <div className="skills-section">
              <div className="progress-bar-label">Skills</div>
              <div className="skills-badges">
                {puppy?.skills?.length > 0 ? (
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
                onClick={refreshCommunityData}
                disabled={actionLoading}
                className="community-button"
                title="Refresh community data"
              >
                🔄 Refresh Community
              </button>
            </div>
          )}
          
          {mode === 'community' && (
            <div className="community-container">
              <div className="community-tabs">
                <button 
                  onClick={() => handleTabChange('browse')}
                  className={activeTab === 'browse' ? 'active' : ''}
                >
                  🐕 Browse Puppies
                </button>
                <button 
                  onClick={() => handleTabChange('leaderboards')}
                  className={activeTab === 'leaderboards' ? 'active' : ''}
                >
                  🏆 Leaderboards
                </button>
                <button 
                  onClick={() => handleTabChange('activity')}
                  className={activeTab === 'activity' ? 'active' : ''}
                >
                  📰 Activity Feed
                </button>
                <button 
                  onClick={() => handleTabChange('stats')}
                  className={activeTab === 'stats' ? 'active' : ''}
                >
                  📊 Community Stats
                </button>
              </div>

              {activeTab === 'browse' && (
                <div className="community-content">
                  {communityPuppies.length === 0 ? (
                    <div className="community-empty">
                      <p>No community puppies available right now.</p>
                      <p>Share your puppy to get started!</p>
                    </div>
                  ) : (
                    <div className="community-list">
                      {communityPuppies.map((communityPuppy) => (
                        <div key={communityPuppy.id} className="community-puppy-card">
                          <h3>{communityPuppy.name}</h3>
                          <p>🐕 {communityPuppy.breed} • 📈 Level {communityPuppy.level}</p>
                          <p>🎂 {communityPuppy.age} days old • 🎯 {communityPuppy.skills} skills</p>
                          <p>😊 Happiness: {communityPuppy.happiness}% • ⚡ Energy: {communityPuppy.energy}%</p>
                          {communityPuppy.popularity && (
                            <p>👀 {communityPuppy.popularity.views} views • 🤝 {communityPuppy.popularity.interactions} interactions</p>
                          )}
                          {communityPuppy.dead && <p style={{color: 'red'}}>💀 Needs urgent care!</p>}
                          <div className="community-puppy-actions">
                            <button onClick={() => careTakePuppy(communityPuppy.id)}>
                              🤝 Take Care
                            </button>
                            <button onClick={() => adoptPuppy(communityPuppy.id)}>
                              💕 Adopt
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'leaderboards' && (
                <div className="community-content">
                  {communityLeaderboards ? (
                    <div className="leaderboards">
                      <div className="leaderboard-section">
                        <h3>🏆 Highest Level Puppies</h3>
                        <div className="leaderboard-list">
                          {communityLeaderboards.highestLevel.map((puppy, index) => (
                            <div key={index} className="leaderboard-item">
                              <span className="rank">#{index + 1}</span>
                              <span className="name">{puppy.name}</span>
                              <span className="breed">({puppy.breed})</span>
                              <span className="stat">Level {puppy.level}</span>
                              <span className="age">{puppy.age} days</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="leaderboard-section">
                        <h3>🎯 Most Skilled Puppies</h3>
                        <div className="leaderboard-list">
                          {communityLeaderboards.mostSkilled.map((puppy, index) => (
                            <div key={index} className="leaderboard-item">
                              <span className="rank">#{index + 1}</span>
                              <span className="name">{puppy.name}</span>
                              <span className="breed">({puppy.breed})</span>
                              <span className="stat">{puppy.skills} skills</span>
                              <span className="level">Level {puppy.level}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="leaderboard-section">
                        <h3>👴 Oldest Puppies</h3>
                        <div className="leaderboard-list">
                          {communityLeaderboards.oldest.map((puppy, index) => (
                            <div key={index} className="leaderboard-item">
                              <span className="rank">#{index + 1}</span>
                              <span className="name">{puppy.name}</span>
                              <span className="breed">({puppy.breed})</span>
                              <span className="stat">{puppy.age} days</span>
                              <span className="level">Level {puppy.level}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="leaderboard-section">
                        <h3>⭐ Most Popular Puppies</h3>
                        <div className="leaderboard-list">
                          {communityLeaderboards.mostPopular.map((puppy, index) => (
                            <div key={index} className="leaderboard-item">
                              <span className="rank">#{index + 1}</span>
                              <span className="name">{puppy.name}</span>
                              <span className="breed">({puppy.breed})</span>
                              <span className="stat">
                                {puppy.popularity.views + puppy.popularity.interactions} interactions
                              </span>
                              <span className="level">Level {puppy.level}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="loading">Loading leaderboards...</div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="community-content">
                  <div className="activity-feed">
                    <h3>📰 Recent Community Activity</h3>
                    {communityActivity.length > 0 ? (
                      <div className="activity-list">
                        {communityActivity.map((activity) => (
                          <div key={activity.id} className="activity-item">
                            <div className="activity-content">
                              <span className="activity-user">{activity.userName}</span>
                              <span className="activity-text">{activity.details}</span>
                            </div>
                            <div className="activity-time">{activity.timeAgo}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="activity-empty">No recent activity</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="community-content">
                  {communityStats ? (
                    <div className="community-stats">
                      <h3>📊 Community Overview</h3>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <div className="stat-value">{communityStats.totalPuppies}</div>
                          <div className="stat-label">Total Puppies</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{communityStats.alivePuppies}</div>
                          <div className="stat-label">Alive & Well</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{communityStats.totalSkills}</div>
                          <div className="stat-label">Total Skills</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{communityStats.averageLevel}</div>
                          <div className="stat-label">Avg Level</div>
                        </div>
                      </div>
                      
                      <h4>🐕 Breed Distribution</h4>
                      <div className="breed-stats">
                        {Object.entries(communityStats.breedDistribution).map(([breed, count]) => (
                          <div key={breed} className="breed-stat">
                            <span className="breed-name">{breed}</span>
                            <span className="breed-count">{count} puppies</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="loading">Loading community stats...</div>
                  )}
                </div>
              )}
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
                onKeyDown={e => { if (e.key === 'Enter' && puppyName.trim() && availableBreeds.length > 0) createPuppy(puppyName); }}
                autoFocus
              />
            </div>
            
            {availableBreeds.length > 0 ? (
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
            ) : (
              <div className="loading">Loading available breeds...</div>
            )}
            
            <div className="dialog-actions">
              <button 
                onClick={() => createPuppy(puppyName)} 
                disabled={!puppyName.trim() || availableBreeds.length === 0}
                className="create-puppy-button"
              >
                🐕 Create {availableBreeds.find(b => b.id === selectedBreed)?.name || 'Puppy'}
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
                        title={communityPuppy.dead ? 'This puppy has died' : 'Adopt this puppy'}
                      >
                        {communityPuppy.dead ? '💀 Dead' : '❤️ Adopt'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => setShowCommunityList(false)}
              className="close-dialog-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Reclaim Dialog */}
      {showReclaimDialog && userPuppyInCommunity && (
        <div className="puppy-dialog-backdrop">
          <div className="puppy-dialog">
            <h2>🏠 Welcome Back!</h2>
            <p>Your puppy <strong>{userPuppyInCommunity.name}</strong> is waiting for you in the community!</p>
            <div className="reclaim-stats">
              <span>Age: {userPuppyInCommunity.age}</span>
              <span>😊 {userPuppyInCommunity.happiness}%</span>
              <span>⚡ {userPuppyInCommunity.energy}%</span>
              <span>🎓 {userPuppyInCommunity.skills} skills</span>
            </div>
            <div className="dialog-actions">
              <button onClick={reclaimPuppy} className="reclaim-button">
                🏠 Bring {userPuppyInCommunity.name} Home
              </button>
              <button onClick={stayInCommunityMode} className="secondary-button">
                🏘️ Stay in Community Mode
              </button>
              <button onClick={createNewPuppy} className="new-puppy-button">
                💕 Adopt New Puppy
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Talk Dialog */}
      {showDialog && (
        <div className="puppy-dialog-backdrop" onClick={() => setShowDialog(false)}>
          <div className="puppy-dialog" onClick={e => e.stopPropagation()}>
            <h2>💬 Chat with {puppy.name}</h2>
            <p>Talk to your puppy to discover hidden skills!</p>
            
            <div className="conversation">
              {conversation.map((msg, idx) => (
                <div key={idx} className={`message ${msg.sender}`}>
                  <strong>{msg.sender === 'user' ? 'You' : puppy.name}:</strong> {msg.text}
                </div>
              ))}
              {talkLoading && <div className="message puppy"><em>🐕 Thinking...</em></div>}
            </div>
            
            <div className="puppy-dialog-inputs">
              <input
                type="text"
                value={userMessage}
                onChange={e => setUserMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                disabled={talkLoading}
                autoFocus
              />
              <button 
                onClick={handleSendMessage} 
                disabled={!userMessage.trim() || talkLoading}
                className="send-button"
              >
                Send
              </button>
            </div>
            
            <button 
              onClick={() => setShowDialog(false)}
              className="close-dialog-button"
            >
              Close Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;