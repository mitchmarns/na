const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const Character = require('../models/character');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login?redirect=' + req.originalUrl);
};

// GET /scenarios - List all scenarios/storylines
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const scenarios = db.prepare(`
      SELECT s.*, u.username as creator_name, 
      COUNT(sp.character_id) as character_count,
      JULIANDAY('now') - JULIANDAY(s.created_at) as days_ago
      FROM scenarios s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN scenario_participants sp ON s.id = sp.scenario_id
      GROUP BY s.id
      ORDER BY s.is_active DESC, s.created_at DESC
    `).all();
    
    res.render('scenarios/index', {
      title: 'Storylines - Hockey Roleplay Hub',
      scenarios,
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

// GET /scenarios/create - Show scenario creation form
router.get('/create', isAuthenticated, (req, res) => {
  try {
    // Get user's characters for dropdown
    const db = getDb();
    const userCharacters = db.prepare('SELECT id, character_name FROM characters WHERE user_id = ?').all(req.session.user.id);
    
    res.render('scenarios/create', {
      title: 'Create Storyline - Hockey Roleplay Hub',
      userCharacters,
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Server Error',
      error: err,
      user: req.session.user
    });
  }
});

// POST /scenarios - Create a new scenario
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const db = getDb();
    
    // Insert scenario
    const scenarioResult = db.prepare(`
      INSERT INTO scenarios (scenario_title, scenario_description, user_id)
      VALUES (?, ?, ?)
    `).run(req.body.title, req.body.description, req.session.user.id);
    
    const scenarioId = scenarioResult.lastInsertRowid;
    
    // Add initial participant if selected
    if (req.body.initialCharacter) {
      db.prepare(`
        INSERT INTO scenario_participants (scenario_id, character_id)
        VALUES (?, ?)
      `).run(scenarioId, req.body.initialCharacter);
    }
    
    res.redirect(`/scenarios/${scenarioId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Creating Storyline',
      error: err,
      user: req.session.user
    });
  }
});

// GET /scenarios/:id - View scenario
router.get('/:id', async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const db = getDb();
    
    // Get scenario info
    const scenario = db.prepare(`
      SELECT s.*, u.username as creator_name
      FROM scenarios s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(scenarioId);
    
    if (!scenario) {
      return res.status(404).render('404', {
        title: 'Storyline Not Found',
        user: req.session.user || null
      });
    }
    
    // Get participants
    const participants = db.prepare(`
      SELECT sp.*, c.character_name, c.character_position, c.character_team, 
      c.profile_image_url, t.team_name, t.team_logo_url, u.username as owner_name
      FROM scenario_participants sp
      JOIN characters c ON sp.character_id = c.id
      LEFT JOIN teams t ON c.character_team = t.team_code
      LEFT JOIN users u ON c.user_id = u.id
      WHERE sp.scenario_id = ?
      ORDER BY sp.joined_at
    `).all(scenarioId);
    
    // Check if user has characters that can join
    let userCharacters = [];
    if (req.session.user) {
      // Get user's characters that are not already participants
      const participantIds = participants.map(p => p.character_id);
      userCharacters = db.prepare(`
        SELECT id, character_name
        FROM characters
        WHERE user_id = ? AND id NOT IN (${participantIds.length > 0 ? participantIds.join(',') : '0'})
      `).all(req.session.user.id);
    }
    
    res.render('scenarios/view', {
      title: `${scenario.scenario_title} - Hockey Roleplay Hub`,
      scenario,
      participants,
      userCharacters,
      isOwner: req.session.user && req.session.user.id === scenario.user_id,
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

// POST /scenarios/:id/join - Join a scenario
router.post('/:id/join', isAuthenticated, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const characterId = req.body.characterId;
    const db = getDb();
    
    // Verify scenario exists
    const scenario = db.prepare('SELECT id FROM scenarios WHERE id = ?').get(scenarioId);
    if (!scenario) {
      return res.status(404).render('404', {
        title: 'Storyline Not Found',
        user: req.session.user
      });
    }
    
    // Verify character belongs to user
    const character = db.prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?').get(characterId, req.session.user.id);
    if (!character) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only add your own characters to storylines' },
        user: req.session.user
      });
    }
    
    // Check if character is already a participant
    const existingParticipant = db.prepare('SELECT id FROM scenario_participants WHERE scenario_id = ? AND character_id = ?').get(scenarioId, characterId);
    if (existingParticipant) {
      return res.redirect(`/scenarios/${scenarioId}`);
    }
    
    // Add character to scenario
    db.prepare(`
      INSERT INTO scenario_participants (scenario_id, character_id)
      VALUES (?, ?)
    `).run(scenarioId, characterId);
    
    res.redirect(`/scenarios/${scenarioId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Joining Storyline',
      error: err,
      user: req.session.user
    });
  }
});

// POST /scenarios/:id/leave - Leave a scenario
router.post('/:id/leave', isAuthenticated, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const characterId = req.body.characterId;
    const db = getDb();
    
    // Verify character belongs to user
    const character = db.prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?').get(characterId, req.session.user.id);
    if (!character) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only remove your own characters from storylines' },
        user: req.session.user
      });
    }
    
    // Remove character from scenario
    db.prepare('DELETE FROM scenario_participants WHERE scenario_id = ? AND character_id = ?').run(scenarioId, characterId);
    
    res.redirect(`/scenarios/${scenarioId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Leaving Storyline',
      error: err,
      user: req.session.user
    });
  }
});

// POST /scenarios/:id/toggle - Toggle scenario active status
router.post('/:id/toggle', isAuthenticated, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const db = getDb();
    
    // Verify scenario exists and belongs to user
    const scenario = db.prepare('SELECT id, is_active FROM scenarios WHERE id = ? AND user_id = ?').get(scenarioId, req.session.user.id);
    if (!scenario) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only manage your own storylines' },
        user: req.session.user
      });
    }
    
    // Toggle active status
    db.prepare('UPDATE scenarios SET is_active = ? WHERE id = ?').run(scenario.is_active === 1 ? 0 : 1, scenarioId);
    
    res.redirect(`/scenarios/${scenarioId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Updating Storyline',
      error: err,
      user: req.session.user
    });
  }
});

// GET /scenarios/:id/edit - Edit scenario form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const db = getDb();
    
    // Get scenario info
    const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(scenarioId);
    
    if (!scenario) {
      return res.status(404).render('404', {
        title: 'Storyline Not Found',
        user: req.session.user
      });
    }
    
    // Check if user is the owner
    if (req.session.user.id !== scenario.user_id) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only edit your own storylines' },
        user: req.session.user
      });
    }
    
    res.render('scenarios/edit', {
      title: `Edit ${scenario.scenario_title} - Hockey Roleplay Hub`,
      scenario,
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Server Error',
      error: err,
      user: req.session.user
    });
  }
});

// POST /scenarios/:id - Update scenario
router.post('/:id/update', isAuthenticated, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const db = getDb();
    
    // Check if user is the owner
    const scenario = db.prepare('SELECT user_id FROM scenarios WHERE id = ?').get(scenarioId);
    
    if (!scenario) {
      return res.status(404).render('404', {
        title: 'Storyline Not Found',
        user: req.session.user
      });
    }
    
    if (req.session.user.id !== scenario.user_id) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only edit your own storylines' },
        user: req.session.user
      });
    }
    
    // Update scenario
    db.prepare(`
      UPDATE scenarios 
      SET scenario_title = ?, scenario_description = ?
      WHERE id = ?
    `).run(req.body.title, req.body.description, scenarioId);
    
    res.redirect(`/scenarios/${scenarioId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Updating Storyline',
      error: err,
      user: req.session.user
    });
  }
});

// POST /scenarios/:id/delete - Delete scenario
router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const db = getDb();
    
    // Check if user is the owner
    const scenario = db.prepare('SELECT user_id FROM scenarios WHERE id = ?').get(scenarioId);
    
    if (!scenario) {
      return res.status(404).render('404', {
        title: 'Storyline Not Found',
        user: req.session.user
      });
    }
    
    if (req.session.user.id !== scenario.user_id) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only delete your own storylines' },
        user: req.session.user
      });
    }
    
    // Start transaction
    db.prepare('BEGIN').run();
    
    // Delete participants
    db.prepare('DELETE FROM scenario_participants WHERE scenario_id = ?').run(scenarioId);
    
    // Delete scenario
    db.prepare('DELETE FROM scenarios WHERE id = ?').run(scenarioId);
    
    // Commit transaction
    db.prepare('COMMIT').run();
    
    res.redirect('/scenarios');
  } catch (err) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Deleting Storyline',
      error: err,
      user: req.session.user
    });
  }
});

module.exports = router;