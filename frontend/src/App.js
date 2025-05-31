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

  // Fetch puppy state from backend
  const fetchPuppy = async () => {
    setLoading(true);
    const fullUrl = `${API_URL}/api/puppy`;
    console.log('🔍 DEBUG: API_URL =', API_URL);
    console.log('🔍 DEBUG: Full URL =', fullUrl);
    console.log('🔍 DEBUG: window.location =', window.location.href);
    
    try {
      console.log('🔍 DEBUG: Starting fetch...');
      const res = await fetch(fullUrl);
      console.log('🔍 DEBUG: Response received =', res);
      console.log('🔍 DEBUG: Response status =', res.status);
      console.log('🔍 DEBUG: Response headers =', [...res.headers.entries()]);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log('🔍 DEBUG: Data received =', data);
      setPuppy(data);
    } catch (error) {
      console.error('🔍 DEBUG: Error details =', error);
      console.error('🔍 DEBUG: Error stack =', error.stack);
      setPuppy({ 
        name: 'Error', 
        happiness: 0, 
        hunger: 100, 
        skills: [], 
        level: 1, 
        age: 0,
        dead: true,
        error: `Failed to connect to backend: ${error.message}` 
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPuppy();
  }, []);

  // Live timer for puppy age
  useEffect(() => {
    if (!puppy || !puppy.birthTime) return;
    const birthTime = Number(puppy.birthTime);
    const interval = setInterval(() => {
      setTimer(formatDuration(Date.now() - birthTime));
    }, 1000);
    setTimer(formatDuration(Date.now() - birthTime));
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
      const res = await fetch(`${API_URL}/api/puppy/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setPuppy(data);
      
      // Show feedback message if action was blocked or has a message
      if (data.message) {
        alert(data.message);
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
      const res = await fetch(`${API_URL}/api/puppy/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'talk', message: userMessage }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
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
          <div className="puppy-emoji-mood-row">
            <div className={`puppy-emoji-container ${animate ? 'bounce' : ''} ${showSkillAnim ? skillAnimType : ''}`} style={{ fontSize: '5rem', transition: 'all 0.2s' }}>
              {showSkillAnim && lastSkill && (
                <div className="puppy-skill-anim">{lastSkill}!</div>
              )}
              <span className="puppy-emoji-base">{getPuppyEmoji()}</span>
            </div>
            <div className="puppy-mood-bar">
              <div className="puppy-mood-label">{getMood().label}</div>
              <div className="puppy-mood-outer">
                <div className="puppy-mood-inner" style={{ width: `${puppy.happiness}%`, background: getMood().color }} />
              </div>
              <div className="puppy-mood-value">{puppy.happiness} / 100</div>
            </div>
          </div>
          <div className="puppy-level">Level {puppy.level}</div>
          {showLevelUp && <div className="puppy-levelup">🎉 Level Up! 🎉</div>}
          {showHiddenSkillNotif && (
            <div className="puppy-hidden-skill-notif">
              ✨ Hidden Skill Unlocked: {hiddenSkillText} ✨
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
          <div className="puppy-actions">
            <button 
              onClick={() => handleAction('feed')} 
              disabled={actionLoading}
              className={puppy.energy > 80 ? 'not-needed' : ''}
              title={puppy.energy > 80 ? 'Not hungry right now' : 'Feed your puppy'}
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
          {actionLoading && <div>Interacting with puppy...</div>}
        </header>
      </div>
      {/* Dialog for talking to the puppy */}
      {showDialog && (
        <div className="puppy-dialog-backdrop" onClick={() => setShowDialog(false)}>
          <div className="puppy-dialog" onClick={e => e.stopPropagation()}>
            <h2>💬 Talk to your puppy!</h2>
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
    </div>
  );
}

export default App;
