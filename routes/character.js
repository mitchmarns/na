// controllers/characters.js
const db = require('../config/db');

/**
 * Get all user's characters
 * @route GET /api/my-characters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getMyCharacters = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const characters = await db.query(
      `SELECT c.*, t.name as team_name
       FROM Characters c
       LEFT JOIN Teams t ON c.team_id = t.id
       WHERE c.user_id = ?
       ORDER BY c.is_active DESC, c.created_at DESC`,
      [userId]
    );
    
    res.status(200).json(characters);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new character
 * @route POST /api/characters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.createCharacter = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      name,
      character_type,
      position,
      role,
      team_id,
      bio,
      avatar_url,
      header_image_url,
      stats_json,
      age,
      nationality,
      hometown,
      height,
      weight,
      handedness,
      years_pro
    } = req.body;
    
    // Begin transaction
    const connection = await db.beginTransaction();
    
    try {
      // Handle creation of first character (set as active)
      const existingCharactersCount = await db.query(
        'SELECT COUNT(*) as count FROM Characters WHERE user_id = ?',
        [userId]
      );
      
      const isFirstCharacter = existingCharactersCount[0].count === 0;
      
      // Insert character
      const characterId = await db.insert('Characters', {
        user_id: userId,
        name,
        character_type: character_type || 'player',
        position: character_type === 'player' ? position : null,
        role: character_type !== 'player' ? role : null,
        team_id: team_id || null,
        bio: bio || null,
        avatar_url: avatar_url || null,
        header_image_url: header_image_url || null,
        stats_json: stats_json || '{}',
        age: age || null,
        nationality: nationality || null,
        hometown: hometown || null,
        height: height || null,
        weight: weight || null,
        handedness: handedness || null,
        years_pro: years_pro || null,
        is_active: isFirstCharacter,
        created_at: new Date()
      });
      
      // If team_id is provided, add character to team
      if (team_id) {
        await db.insert('TeamMembers', {
          team_id,
          character_id: characterId,
          role: 'player',
          joined_at: new Date()
        });
      }
      
      // Commit transaction
      await db.commitTransaction(connection);
      
      // Get created character with team name
      const character = await db.queryOne(
        `SELECT c.*, t.name as team_name
         FROM Characters c
         LEFT JOIN Teams t ON c.team_id = t.id
         WHERE c.id = ?`,
        [characterId]
      );
      
      res.status(201).json({
        message: 'Character created successfully',
        id: characterId,
        character
      });
    } catch (error) {
      // Rollback transaction on error
      await db.rollbackTransaction(connection);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get character by ID
 * @route GET /api/characters/:id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getCharacterById = async (req, res, next) => {
  try {
    const characterId = req.params.id;
    
    const character = await db.queryOne(
      `SELECT c.*, t.name as team_name
       FROM Characters c
       LEFT JOIN Teams t ON c.team_id = t.id
       WHERE c.id = ?`,
      [characterId]
    );
    
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    // Check if the character belongs to the authenticated user
    // If not, remove sensitive information
    if (character.user_id !== req.user.id) {
      delete character.user_id;
      // Add any other sensitive fields to remove
    }
    
    res.status(200).json(character);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a character
 * @route PUT /api/characters/:id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateCharacter = async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = req.user.id;
    
    // Check if character exists and belongs to user
    const existingCharacter = await db.queryOne(
      'SELECT * FROM Characters WHERE id = ?',
      [characterId]
    );
    
    if (!existingCharacter) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    if (existingCharacter.user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this character' });
    }
    
    // Destructure updatable fields
    const {
      name,
      character_type,
      position,
      role,
      team_id,
      bio,
      avatar_url,
      header_image_url,
      stats_json,
      age,
      nationality,
      hometown,
      height,
      weight,
      handedness,
      years_pro,
      is_active
    } = req.body;
    
    // Begin transaction
    const connection = await db.beginTransaction();
    
    try {
      // Prepare update object with only provided fields
      const updateData = {
        ...(name && { name }),
        ...(character_type && { character_type }),
        ...(position && { position: character_type === 'player' ? position : null }),
        ...(role && { role: character_type !== 'player' ? role : null }),
        ...(team_id !== undefined && { team_id }),
        ...(bio && { bio }),
        ...(avatar_url !== undefined && { avatar_url }),
        ...(header_image_url !== undefined && { header_image_url }),
        ...(stats_json && { stats_json }),
        ...(age !== undefined && { age }),
        ...(nationality !== undefined && { nationality }),
        ...(hometown !== undefined && { hometown }),
        ...(height !== undefined && { height }),
        ...(weight !== undefined && { weight }),
        ...(handedness !== undefined && { handedness }),
        ...(years_pro !== undefined && { years_pro }),
        ...(is_active !== undefined && { is_active })
      };
      
      // If is_active is being set to true, deactivate other characters
      if (is_active === true) {
        await db.query(
          'UPDATE Characters SET is_active = 0 WHERE user_id = ? AND id != ?',
          [userId, characterId]
        );
      }
      
      // Update character
      await db.update('Characters', updateData, {
        id: characterId,
        user_id: userId
      });
      
      // Handle team membership if team_id is changed
      if (team_id !== undefined && team_id !== existingCharacter.team_id) {
        // Remove from previous team if exists
        if (existingCharacter.team_id) {
          await db.query(
            'DELETE FROM TeamMembers WHERE character_id = ? AND team_id = ?',
            [characterId, existingCharacter.team_id]
          );
        }
        
        // Add to new team
        await db.insert('TeamMembers', {
          team_id,
          character_id: characterId,
          role: 'player',
          joined_at: new Date()
        });
      }
      
      // Commit transaction
      await db.commitTransaction(connection);
      
      // Fetch updated character with team name
      const updatedCharacter = await db.queryOne(
        `SELECT c.*, t.name as team_name
         FROM Characters c
         LEFT JOIN Teams t ON c.team_id = t.id
         WHERE c.id = ?`,
        [characterId]
      );
      
      res.status(200).json({
        message: 'Character updated successfully',
        character: updatedCharacter
      });
    } catch (error) {
      // Rollback transaction on error
      await db.rollbackTransaction(connection);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a character
 * @route DELETE /api/characters/:id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.deleteCharacter = async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = req.user.id;
    
    // Begin transaction
    const connection = await db.beginTransaction();
    
    try {
      // Check if character exists and belongs to user
      const existingCharacter = await db.queryOne(
        'SELECT * FROM Characters WHERE id = ?',
        [characterId]
      );
      
      if (!existingCharacter) {
        return res.status(404).json({ message: 'Character not found' });
      }
      
      if (existingCharacter.user_id !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this character' });
      }
      
      // Remove team memberships
      await db.query(
        'DELETE FROM TeamMembers WHERE character_id = ?',
        [characterId]
      );
      
      // Delete the character
      await db.query(
        'DELETE FROM Characters WHERE id = ?',
        [characterId]
      );
      
      // Commit transaction
      await db.commitTransaction(connection);
      
      res.status(200).json({ 
        message: 'Character deleted successfully',
        id: characterId 
      });
    } catch (error) {
      // Rollback transaction on error
      await db.rollbackTransaction(connection);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};