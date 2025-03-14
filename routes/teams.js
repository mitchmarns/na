const express = require('express');
const router = express.Router();
const Character = require('../models/character');
const { getDb } = require('../db/database');

// GET /teams - List all teams
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const teams = db.prepare(`
      SELECT t.*, COUNT(c.id) as player_count
      FROM teams t
      LEFT JOIN characters c ON t.team_code = c.character_team
      GROUP BY t.id
      ORDER BY t.team_name
    `).all();
    
    res.render('teams/index', {
      title: 'Teams - Hockey Roleplay Hub',
      teams,
      user: req.session.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Server Error',
      error: err,
      user: req.session.user || null
    });
  }
});

// GET /teams/:code - View team profile
router.get('/:code', async (req, res) => {
  try {
    const teamCode = req.params.code;
    const db = getDb();
    
    // Get team info
    const team = db.prepare('SELECT * FROM teams WHERE team_code = ?').get(teamCode);
    
    if (!team) {
      return res.status(404).render('404', {
        title: 'Team Not Found',
        user: req.session.user || null
      });
    }
    
    // Get team members
    const teamMembers = Character.getByTeam(teamCode);
    
    // Group players by position
    const positions = {
      coach: teamMembers.filter(m => m.character_position === 'coach'),
      staff: teamMembers.filter(m => m.character_position === 'staff'),
      goalie: teamMembers.filter(m => m.character_position === 'goalie'),
      defense: teamMembers.filter(m => m.character_position === 'defense'),
      center: teamMembers.filter(m => m.character_position === 'center'),
      leftwing: teamMembers.filter(m => m.character_position === 'leftwing'),
      rightwing: teamMembers.filter(m => m.character_position === 'rightwing')
    };
    
    // Get team statistics
    const stats = {
      totalPlayers: teamMembers.length,
      activePlayers: teamMembers.filter(m => m.character_status === 'active').length,
      injuredPlayers: teamMembers.filter(m => m.character_status === 'injured').length
    };
    
    res.render('teams/profile', {
      title: `${team.team_name} - Hockey Roleplay Hub`,
      team,
      teamMembers,
      positions,
      stats,
      user: req.session.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Server Error',
      error: err,
      user: req.session.user || null
    });
  }
});

module.exports = router;