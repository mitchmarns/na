const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Character = require('../models/character');
const { getDb } = require('../db/database');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/characters');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login?redirect=' + req.originalUrl);
};

// GET /characters - List all characters
router.get('/', async (req, res) => {
  try {
    // Get query parameters for filtering
    const filters = {
      team: req.query.team || 'all',
      position: req.query.position || 'all',
      status: req.query.status || 'all',
      type: req.query.type || 'all',
      search: req.query.search || ''
    };
    
    // Get all characters with filters
    const characters = Character.getAll(filters);
    
    // Get teams for filter dropdown
    const db = getDb();
    const teams = db.prepare('SELECT * FROM teams ORDER BY team_name').all();
    
    res.render('characters/index', {
      title: 'Characters - Hockey Roleplay Hub',
      characters,
      filters,
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

// GET /characters/create - Show character creation form
router.get('/create', isAuthenticated, (req, res) => {
  // Get teams for dropdown
  const db = getDb();
  const teams = db.prepare('SELECT * FROM teams ORDER BY team_name').all();
  
  // Get all characters for relationship dropdown
  const characters = Character.getAll();
  
  res.render('characters/create', {
    title: 'Create Character - Hockey Roleplay Hub',
    teams,
    characters,
    user: req.session.user || null
  });
});

// POST /characters - Create a new character
router.post('/', isAuthenticated, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'additionalImages', maxCount: 10 }
]), async (req, res) => {
  try {
    // Prepare character data
    const characterData = {
      ...req.body,
      userId: req.session.user.id
    };
    
    // Handle file uploads
    if (req.files.profileImage && req.files.profileImage.length > 0) {
      characterData.profileImageUrl = '/uploads/characters/' + req.files.profileImage[0].filename;
    }
    
    if (req.files.additionalImages && req.files.additionalImages.length > 0) {
      characterData.additionalImages = req.files.additionalImages.map(file => {
        return '/uploads/characters/' + file.filename;
      });
    }
    
    // Create character
    const characterId = Character.create(characterData);
    
    res.redirect(`/characters/${characterId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Creating Character',
      error: err,
      user: req.session.user || null
    });
  }
});

// GET /characters/:id - View character profile
router.get('/:id', async (req, res) => {
  try {
    const characterId = req.params.id;
    const character = Character.getById(characterId);
    
    if (!character) {
      return res.status(404).render('404', {
        title: 'Character Not Found',
        user: req.session.user || null
      });
    }
    
    // Get related characters
    const db = getDb();
    const relationships = db.prepare(`
      SELECT cr.*, c.character_name, c.profile_image_url 
      FROM character_relationships cr
      JOIN characters c ON cr.related_character_id = c.id
      WHERE cr.character_id = ?
    `).all(characterId);
    
    // Get scenarios the character is involved in
    const scenarios = db.prepare(`
      SELECT s.* 
      FROM scenarios s
      JOIN scenario_participants sp ON s.id = sp.scenario_id
      WHERE sp.character_id = ?
      ORDER BY s.created_at DESC
    `).all(characterId);
    
    res.render('characters/profile', {
      title: `${character.character_name} - Hockey Roleplay Hub`,
      character,
      relationships,
      scenarios,
      isOwner: req.session.user && req.session.user.id === character.user_id,
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

// GET /characters/:id/edit - Show character edit form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const character = Character.getById(characterId);
    
    if (!character) {
      return res.status(404).render('404', {
        title: 'Character Not Found',
        user: req.session.user || null
      });
    }
    
    // Check if user is the owner of the character
    if (req.session.user.id !== character.user_id) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only edit your own characters' },
        user: req.session.user || null
      });
    }
    
    // Get teams for dropdown
    const db = getDb();
    const teams = db.prepare('SELECT * FROM teams ORDER BY team_name').all();
    
    // Get all characters for relationship dropdown
    const characters = Character.getAll().filter(c => c.id !== parseInt(characterId));
    
    res.render('characters/edit', {
      title: `Edit ${character.character_name} - Hockey Roleplay Hub`,
      character,
      teams,
      characters,
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

// POST /characters/:id - Update a character
router.post('/:id', isAuthenticated, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'additionalImages', maxCount: 10 }
]), async (req, res) => {
  try {
    const characterId = req.params.id;
    const character = Character.getById(characterId);
    
    if (!character) {
      return res.status(404).render('404', {
        title: 'Character Not Found',
        user: req.session.user || null
      });
    }
    
    // Check if user is the owner of the character
    if (req.session.user.id !== character.user_id) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only edit your own characters' },
        user: req.session.user || null
      });
    }
    
    // Prepare character data
    const characterData = {
      ...req.body
    };
    
    // Handle file uploads
    if (req.files.profileImage && req.files.profileImage.length > 0) {
      characterData.profileImageUrl = '/uploads/characters/' + req.files.profileImage[0].filename;
      
      // Delete old profile image if it exists
      if (character.profile_image_url && character.profile_image_url !== characterData.profileImageUrl) {
        const oldImagePath = path.join(__dirname, '../public', character.profile_image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    if (req.files.additionalImages && req.files.additionalImages.length > 0) {
      characterData.additionalImages = req.files.additionalImages.map(file => {
        return '/uploads/characters/' + file.filename;
      });
    }
    
    // Update character
    Character.update(characterId, characterData);
    
    res.redirect(`/characters/${characterId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Updating Character',
      error: err,
      user: req.session.user || null
    });
  }
});

// POST /characters/:id/delete - Delete a character
router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const characterId = req.params.id;
    const character = Character.getById(characterId);
    
    if (!character) {
      return res.status(404).render('404', {
        title: 'Character Not Found',
        user: req.session.user || null
      });
    }
    
    // Check if user is the owner of the character
    if (req.session.user.id !== character.user_id) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        error: { message: 'You can only delete your own characters' },
        user: req.session.user || null
      });
    }
    
    // Delete character images from filesystem
    if (character.images && character.images.length > 0) {
      character.images.forEach(image => {
        const imagePath = path.join(__dirname, '../public', image.image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }
    
    // Delete character from database
    Character.delete(characterId);
    
    res.redirect('/characters');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error Deleting Character',
      error: err,
      user: req.session.user || null
    });
  }
});

module.exports = router;