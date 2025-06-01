const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/puppy_game',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        session_id VARCHAR(50) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS puppies (
        id VARCHAR(50) PRIMARY KEY,
        owner_id VARCHAR(50) REFERENCES users(id),
        name VARCHAR(100) NOT NULL,
        breed VARCHAR(50) NOT NULL,
        birth_time BIGINT NOT NULL,
        happiness INTEGER DEFAULT 50,
        energy INTEGER DEFAULT 50,
        skills TEXT[] DEFAULT '{}',
        level INTEGER DEFAULT 1,
        last_update_time BIGINT DEFAULT EXTRACT(epoch FROM NOW()) * 1000,
        last_active_time BIGINT DEFAULT EXTRACT(epoch FROM NOW()) * 1000,
        dead BOOLEAN DEFAULT FALSE,
        in_community BOOLEAN DEFAULT FALSE,
        messages TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS community_activity (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        puppy_name VARCHAR(100) NOT NULL,
        user_name VARCHAR(100) DEFAULT 'Anonymous',
        details TEXT,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS puppy_popularity (
        puppy_id VARCHAR(50) PRIMARY KEY,
        views INTEGER DEFAULT 0,
        interactions INTEGER DEFAULT 0,
        adoptions INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    client.release();
  }
}

// Database operations
const db = {
  // User operations
  async createUser(userId, sessionId) {
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO users (id, session_id) VALUES ($1, $2) ON CONFLICT (session_id) DO NOTHING',
        [userId, sessionId]
      );
    } finally {
      client.release();
    }
  },

  async getUserBySession(sessionId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id FROM users WHERE session_id = $1', [sessionId]);
      return result.rows[0]?.id;
    } finally {
      client.release();
    }
  },

  // Puppy operations
  async createPuppy(puppy) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO puppies (id, owner_id, name, breed, birth_time, happiness, energy, skills, level, 
                           last_update_time, last_active_time, dead, in_community, messages)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          happiness = EXCLUDED.happiness,
          energy = EXCLUDED.energy,
          skills = EXCLUDED.skills,
          level = EXCLUDED.level,
          last_update_time = EXCLUDED.last_update_time,
          last_active_time = EXCLUDED.last_active_time,
          dead = EXCLUDED.dead,
          in_community = EXCLUDED.in_community,
          messages = EXCLUDED.messages
      `, [
        puppy.id, puppy.owner, puppy.name, puppy.breed, puppy.birthTime,
        puppy.happiness, puppy.energy, puppy.skills, puppy.level,
        puppy.lastUpdateTime, puppy.lastActiveTime, puppy.dead,
        puppy.inCommunity, puppy.messages
      ]);
    } finally {
      client.release();
    }
  },

  async getPuppyByOwner(ownerId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM puppies WHERE owner_id = $1 AND in_community = FALSE', [ownerId]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      
      // Reconstruct breedInfo from breed ID
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
      
      return {
        id: row.id,
        owner: row.owner_id,
        name: row.name,
        breed: row.breed,
        breedInfo: DOG_BREEDS[row.breed] || DOG_BREEDS['labrador'],
        birthTime: parseInt(row.birth_time),
        happiness: row.happiness,
        energy: row.energy,
        skills: row.skills || [],
        level: row.level,
        lastUpdateTime: parseInt(row.last_update_time),
        lastActiveTime: parseInt(row.last_active_time),
        dead: row.dead,
        inCommunity: row.in_community,
        messages: row.messages || []
      };
    } finally {
      client.release();
    }
  },

  async getCommunityPuppies() {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM puppies WHERE in_community = TRUE ORDER BY last_active_time ASC');
      
      // Reconstruct breedInfo from breed ID
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
      
      return result.rows.map(row => ({
        id: row.id,
        owner: row.owner_id,
        name: row.name,
        breed: row.breed,
        breedInfo: DOG_BREEDS[row.breed] || DOG_BREEDS['labrador'],
        birthTime: parseInt(row.birth_time),
        happiness: row.happiness,
        energy: row.energy,
        skills: row.skills || [],
        level: row.level,
        lastUpdateTime: parseInt(row.last_update_time),
        lastActiveTime: parseInt(row.last_active_time),
        dead: row.dead,
        inCommunity: row.in_community,
        messages: row.messages || []
      }));
    } finally {
      client.release();
    }
  },

  async movePuppyToCommunity(puppyId) {
    const client = await pool.connect();
    try {
      await client.query('UPDATE puppies SET in_community = TRUE WHERE id = $1', [puppyId]);
    } finally {
      client.release();
    }
  },

  async adoptPuppyFromCommunity(puppyId, newOwnerId) {
    const client = await pool.connect();
    try {
      await client.query('UPDATE puppies SET owner_id = $1, in_community = FALSE WHERE id = $2', [newOwnerId, puppyId]);
    } finally {
      client.release();
    }
  },

  // Community activity operations
  async addCommunityActivity(activity) {
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO community_activity (id, type, puppy_name, user_name, details, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
        [activity.id, activity.type, activity.puppyName, activity.userName, activity.details, activity.timestamp]
      );
      
      // Keep only last 50 activities
      await client.query(`
        DELETE FROM community_activity 
        WHERE id NOT IN (
          SELECT id FROM community_activity 
          ORDER BY timestamp DESC 
          LIMIT 50
        )
      `);
    } finally {
      client.release();
    }
  },

  async getCommunityActivity(limit = 30) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM community_activity ORDER BY timestamp DESC LIMIT $1',
        [limit]
      );
      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        puppyName: row.puppy_name,
        userName: row.user_name,
        details: row.details,
        timestamp: parseInt(row.timestamp)
      }));
    } finally {
      client.release();
    }
  },

  // Popularity operations
  async updatePopularity(puppyId, type) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO puppy_popularity (puppy_id, ${type})
        VALUES ($1, 1)
        ON CONFLICT (puppy_id) DO UPDATE SET
          ${type} = puppy_popularity.${type} + 1,
          updated_at = NOW()
      `, [puppyId]);
    } finally {
      client.release();
    }
  },

  async getPopularity(puppyId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM puppy_popularity WHERE puppy_id = $1', [puppyId]);
      if (result.rows.length === 0) {
        return { views: 0, interactions: 0, adoptions: 0 };
      }
      const row = result.rows[0];
      return {
        views: row.views,
        interactions: row.interactions,
        adoptions: row.adoptions
      };
    } finally {
      client.release();
    }
  }
};

module.exports = { initializeDatabase, db }; 