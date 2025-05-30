import React, { useEffect, useState } from 'react';
import './App.css';

const DOG_TRICKS = [
  'Sit', 'Stay', 'Roll Over', 'Shake Paw', 'Play Dead', 'Fetch', 'Spin', 'Speak', 'High Five', 'Jump', 'Dance', 'Crawl', 'Back Up', 'Bow', 'Wave', 'Balance Treat', 'Heel', 'Find It', 'Ring Bell', 'Open Door'
];

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

  // Helper to pick puppy face
  const getPuppyFace = () => {
    if (!puppy) return '';
    if (puppy.happiness > 80) return '😃';
    if (puppy.hunger > 70) return '🥺';
    if (puppy.happiness < 30) return '😐';
    return '';
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

  // Fetch puppy state from backend
  const fetchPuppy = async () => {
    setLoading(true);
    const res = await fetch('http://localhost:5050/api/puppy');
    const data = await res.json();
    setPuppy(data);
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
  }, [puppy]);

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
  }, [puppy]);

  // Send action to backend
  const handleAction = async (action) => {
    if (action === 'talk') {
      setShowDialog(true);
      return;
    }
    setActionLoading(true);
    setAnimate(true);
    const res = await fetch('http://localhost:5050/api/puppy/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setPuppy(data);
    setActionLoading(false);
    setTimeout(() => setAnimate(false), 700);
  };

  // Handle sending a message in the dialog
  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;
    setTalkLoading(true);
    const res = await fetch('http://localhost:5050/api/puppy/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'talk', message: userMessage }),
    });
    const data = await res.json();
    setPuppy(data.puppy || data); // fallback for old response
    setConversation((prev) => [
      ...prev,
      { from: 'user', text: userMessage },
      { from: 'puppy', text: data.reply || 'Woof! 🐾' },
    ]);
    setUserMessage('');
    setTalkLoading(false);
  };

  if (loading) return <div className="App">Loading puppy...</div>;

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
          <div className="puppy-timer">Puppy age: {timer}</div>
          <div className="puppy-stats">
            <ProgressBar label="Age" value={parseFloat(puppy.age)} max={10} color="#a3d977" />
            <ProgressBar label="Happiness" value={puppy.happiness} max={100} color="#ffe066" />
            <ProgressBar label="Hunger" value={100 - puppy.hunger} max={100} color="#ff7675" />
            <ProgressBar label="Skills" value={puppy.skills.length} max={DOG_TRICKS.length} color="#b388ff" />
            <div className="skills-section">
              <div className="progress-bar-label">Skills</div>
              <div className="skills-badges">
                {puppy.skills.length > 0 ? (
                  puppy.skills.map((skill, idx) => (
                    <span className="skill-badge" key={idx}>{skill}</span>
                  ))
                ) : (
                  <span className="skill-badge none">None yet!</span>
                )}
              </div>
            </div>
          </div>
          <div className="puppy-actions">
            <button onClick={() => handleAction('feed')} disabled={actionLoading}>🍖 Feed</button>
            <button onClick={() => handleAction('play')} disabled={actionLoading}>🎾 Play</button>
            <button onClick={() => handleAction('train')} disabled={actionLoading}>🧠 Train</button>
            <button onClick={() => handleAction('talk')} disabled={actionLoading}>💬 Talk</button>
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
