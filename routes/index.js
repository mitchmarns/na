// routes/index.js
const express = require('express');
const router = express.Router();
const Character = require('../models/characters');

/**
 * Home page route
 */
router.get('/', (req, res) => {
  try {
    // Get featured characters
    const featuredCharacters = Character.getAll();
    
    // Ensure featuredCharacters is an array before using slice
    const featured = Array.isArray(featuredCharacters) 
      ? featuredCharacters.slice(0, 3) 
      : [];
    
    // Get active scenarios/storylines
    // This would typically call a Scenario model function
    const recentScenarios = []; // Placeholder for scenario data
    
    res.render('index', {
      title: 'Hockey Roleplay Hub',
      featuredCharacters: featured,
      recentScenarios: recentScenarios,
      user: req.session.user || null
    });
  } catch (error) {
    console.error("Error loading home page:", error);
    res.status(500).render('error', { 
      title: 'Server Error', 
      error: error,
      user: req.session.user || null 
    });
  }
});

/**
 * About page route
 */
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Hockey Roleplay Hub',
    user: req.session.user || null
  });
});

/**
 * Contact page route
 */
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us',
    user: req.session.user || null
  });
});

/**
 * Rules page route
 */
router.get('/rules', (req, res) => {
  res.render('rules', {
    title: 'Community Rules',
    user: req.session.user || null
  });
});

/**
 * FAQ page route
 */
router.get('/faq', (req, res) => {
  res.render('faq', {
    title: 'Frequently Asked Questions',
    user: req.session.user || null
  });
});

/**
 * Guide page route
 */
router.get('/guide', (req, res) => {
  res.render('guide', {
    title: 'Roleplaying Guide',
    user: req.session.user || null
  });
});

module.exports = router;