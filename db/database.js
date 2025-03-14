const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

let db = null;

/**
 * Initialize the SQLite database
 */
function initializeDatabase() {
  try {
    // Create database directory if it doesn't exist
    const dbDir = path.join(__dirname, '..', 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database connection
    const dbPath = path.join(dbDir, 'hockey_rp_hub.sqlite');
    db = new sqlite3.Database(dbPath);
    
    // Create tables if they don't exist
    createTables();
    
    console.log('Database initialized successfully');
    return db;
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  }
}

/**
 * Get database connection
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

/**
 * Create necessary tables
 */
function createTables() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Characters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      character_name TEXT NOT NULL,
      character_type TEXT NOT NULL,
      character_age INTEGER,
      character_gender TEXT,
      character_team TEXT,
      character_position TEXT,
      character_number INTEGER,
      character_status TEXT,
      character_bio TEXT,
      character_height TEXT,
      character_weight TEXT,
      character_handedness TEXT,
      profile_image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Character Stats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER,
      stat_speed INTEGER DEFAULT 75,
      stat_shooting INTEGER DEFAULT 75,
      stat_passing INTEGER DEFAULT 75,
      stat_defense INTEGER DEFAULT 75,
      stat_checking INTEGER DEFAULT 75,
      stat_endurance INTEGER DEFAULT 75,
      stat_glove INTEGER DEFAULT 75,
      stat_positioning INTEGER DEFAULT 75,
      stat_games INTEGER DEFAULT 0,
      stat_goals INTEGER DEFAULT 0,
      stat_assists INTEGER DEFAULT 0,
      stat_plus_minus INTEGER DEFAULT 0,
      stat_pim INTEGER DEFAULT 0,
      stat_toi REAL DEFAULT 0,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);

  // Teams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name TEXT NOT NULL,
      team_code TEXT UNIQUE NOT NULL,
      team_logo_url TEXT,
      team_description TEXT,
      team_colors TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Scenarios/Storylines table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_title TEXT NOT NULL,
      scenario_description TEXT,
      user_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Character Images table
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER,
      image_url TEXT NOT NULL,
      is_profile BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);

  // Character Background table
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_backgrounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER,
      birthplace TEXT,
      education TEXT,
      background TEXT,
      hobbies TEXT,
      goals TEXT,
      ethnicity TEXT,
      hair TEXT,
      eyes TEXT,
      appearance TEXT,
      personality TEXT,
      face_reference TEXT,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);

  // Character Relationships table
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER,
      related_character_id INTEGER,
      relationship_type TEXT,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (related_character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);

  // Scenario Participants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenario_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_id INTEGER,
      character_id INTEGER,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);

  // Insert default teams
  insertDefaultTeams();
}

/**
 * Insert default teams
 */
function insertDefaultTeams() {
  const teams = [
    { name: 'Wolves', code: 'wolves', logo: '/images/logos/team1.png', description: 'A dynamic team known for their speed and aggressive forechecking.', colors: 'Blue, Gray' },
    { name: 'Eagles', code: 'eagles', logo: '/images/logos/team2.png', description: 'Masters of the power play with excellent special teams.', colors: 'Gold, Brown' },
    { name: 'Bears', code: 'bears', logo: '/images/logos/team3.png', description: 'Known for their physical play and defensive prowess.', colors: 'Brown, Black' },
    { name: 'Falcons', code: 'falcons', logo: '/images/logos/team4.png', description: 'A well-balanced team with skilled skaters in every position.', colors: 'Red, White' }
  ];

  // Check if teams already exist
  db.get('SELECT COUNT(*) as count FROM teams', (err, row) => {
    if (err) {
      console.error('Error checking teams:', err.message);
      return;
    }
    
    if (row.count === 0) {
      // Insert teams
      const stmt = db.prepare(`
        INSERT INTO teams (team_name, team_code, team_logo_url, team_description, team_colors)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      teams.forEach(team => {
        stmt.run(team.name, team.code, team.logo, team.description, team.colors);
      });
      
      stmt.finalize();
    }
  });
}

module.exports = {
  initializeDatabase,
  getDb
};