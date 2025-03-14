const express = require('express');
const router = express.Router();
const Character = require('../models/characters');
const { getDb } = require('../db/database');

// GET / - Home page
router.get('/', async (req, res) => {
  try {
    // Get featured characters
    const featuredCharacters = Character.getAll();
    
    // Limit to 3 characters for the homepage
    const displayCharacters = featuredCharacters.slice(0, 3);
    
    // Get featured teams
    const db = getDb();
    const teams = db.prepare('SELECT * FROM teams ORDER BY team_name LIMIT 4').all();
    
    // Get recent scenarios
    const scenarios = db.prepare(`
      SELECT s.*, COUNT(sp.character_id) as character_count, 
      JULIANDAY('now') - JULIANDAY(s.created_at) as days_ago
      FROM scenarios s
      LEFT JOIN scenario_participants sp ON s.id = sp.scenario_id
      WHERE s.is_active = 1
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 2
    `).all();
    
    res.render('index', {
      title: 'Hockey Roleplay Hub',
      featuredCharacters: displayCharacters,
      teams,
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

// GET /about - About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About - Hockey Roleplay Hub',
    user: req.session.user || null
  });
});

// GET /rules - Community rules page
router.get('/rules', (req, res) => {
  res.render('rules', {
    title: 'Community Rules - Hockey Roleplay Hub',
    user: req.session.user || null
  });
});

// GET /guide - Roleplaying guide page
router.get('/guide', (req, res) => {
  res.render('guide', {
    title: 'Roleplaying Guide - Hockey Roleplay Hub',
    user: req.session.user || null
  });
});

// GET /faq - FAQ page
router.get('/faq', (req, res) => {
  res.render('faq', {
    title: 'Frequently Asked Questions - Hockey Roleplay Hub',
    user: req.session.user || null
  });
});

// GET /contact - Contact page
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us - Hockey Roleplay Hub',
    user: req.session.user || null
  });
});

// POST /contact - Process contact form
router.post('/contact', (req, res) => {
  // In a real application, you would send an email or save to database
  // For now, we'll just redirect with a success message
  req.session.contactSuccess = true;
  res.redirect('/contact');
});

// GET /profile - User profile page (requires authentication)
router.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login?redirect=/profile');
  }
  
  try {
    // Get user's characters
    const db = getDb();
    const userCharacters = db.prepare(`
      SELECT c.*, t.team_name, t.team_logo_url
      FROM characters c
      LEFT JOIN teams t ON c.character_team = t.team_code
      WHERE c.user_id = ?
      ORDER BY c.character_name
    `).all(req.session.user.id);
    
    res.render('profile', {
      title: 'My Profile - Hockey Roleplay Hub',
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

module.exports = router;