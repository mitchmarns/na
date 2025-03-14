const { getDb } = require('../db/database');

class Team {
  /**
   * Get all teams
   */
  static getAll() {
    const db = getDb();
    return db.prepare('SELECT * FROM teams').all();
  }

  // Add other team-related methods as needed
}

module.exports = Team;