const { getDb } = require('../db/database');

class Character {
  /**
   * Create a new character
   */
  static create(characterData) {
    const db = getDb();
    
    try {
      // Start transaction
      db.prepare('BEGIN').run();
      
      // Insert character basic info
      const characterInsert = db.prepare(`
        INSERT INTO characters (
          user_id, character_name, character_type, character_age, 
          character_gender, character_team, character_position, 
          character_number, character_status, character_bio,
          character_height, character_weight, character_handedness,
          profile_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const characterResult = characterInsert.run(
        characterData.userId,
        characterData.characterName,
        characterData.characterType,
        characterData.characterAge,
        characterData.characterGender,
        characterData.characterTeam,
        characterData.characterPosition,
        characterData.characterNumber,
        characterData.characterStatus,
        characterData.characterBio,
        characterData.characterHeight,
        characterData.characterWeight,
        characterData.characterHandedness,
        characterData.profileImageUrl
      );
      
      const characterId = characterResult.lastInsertRowid;
      
      // Insert character stats
      if (characterData.characterType === 'hockey') {
        const statsInsert = db.prepare(`
          INSERT INTO character_stats (
            character_id, stat_speed, stat_shooting, stat_passing, 
            stat_defense, stat_checking, stat_endurance, 
            stat_glove, stat_positioning, stat_games, 
            stat_goals, stat_assists, stat_plus_minus, 
            stat_pim, stat_toi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        statsInsert.run(
          characterId,
          characterData.statSpeed || 75,
          characterData.statShooting || 75,
          characterData.statPassing || 75,
          characterData.statDefense || 75,
          characterData.statChecking || 75,
          characterData.statEndurance || 75,
          characterData.statGlove || 75,
          characterData.statPositioning || 75,
          characterData.statGames || 0,
          characterData.statGoals || 0,
          characterData.statAssists || 0,
          characterData.statPlusMinus || 0,
          characterData.statPIM || 0,
          characterData.statTOI || 0
        );
      }
      
      // Insert character background
      const backgroundInsert = db.prepare(`
        INSERT INTO character_backgrounds (
          character_id, birthplace, education, background, 
          hobbies, goals, ethnicity, hair, 
          eyes, appearance, personality, face_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      backgroundInsert.run(
        characterId,
        characterData.characterBirthplace,
        characterData.characterEducation,
        characterData.characterBackground,
        characterData.characterHobbies,
        characterData.characterGoals,
        characterData.characterEthnicity,
        characterData.characterHair,
        characterData.characterEyes,
        characterData.characterAppearance,
        characterData.characterPersonality,
        characterData.characterFaceReference
      );
      
      // Insert relationship if applicable
      if (characterData.relatedCharacter && characterData.relationshipType) {
        const relationshipInsert = db.prepare(`
          INSERT INTO character_relationships (
            character_id, related_character_id, relationship_type
          ) VALUES (?, ?, ?)
        `);
        
        relationshipInsert.run(
          characterId,
          characterData.relatedCharacter,
          characterData.relationshipType
        );
      }
      
      // Insert additional images if any
      if (characterData.additionalImages && characterData.additionalImages.length > 0) {
        const imageInsert = db.prepare(`
          INSERT INTO character_images (
            character_id, image_url, is_profile
          ) VALUES (?, ?, ?)
        `);
        
        characterData.additionalImages.forEach(imageUrl => {
          imageInsert.run(characterId, imageUrl, 0);
        });
      }
      
      // Insert profile image in the images table as well
      if (characterData.profileImageUrl) {
        const profileImageInsert = db.prepare(`
          INSERT INTO character_images (
            character_id, image_url, is_profile
          ) VALUES (?, ?, ?)
        `);
        
        profileImageInsert.run(characterId, characterData.profileImageUrl, 1);
      }
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      return characterId;
    } catch (err) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw err;
    }
  }

  /**
   * Update an existing character
   */
  static update(characterId, characterData) {
    const db = getDb();
    
    try {
      // Start transaction
      db.prepare('BEGIN').run();
      
      // Update character basic info
      const characterUpdate = db.prepare(`
        UPDATE characters SET
          character_name = ?,
          character_type = ?,
          character_age = ?,
          character_gender = ?,
          character_team = ?,
          character_position = ?,
          character_number = ?,
          character_status = ?,
          character_bio = ?,
          character_height = ?,
          character_weight = ?,
          character_handedness = ?,
          profile_image_url = COALESCE(?, profile_image_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      characterUpdate.run(
        characterData.characterName,
        characterData.characterType,
        characterData.characterAge,
        characterData.characterGender,
        characterData.characterTeam,
        characterData.characterPosition,
        characterData.characterNumber,
        characterData.characterStatus,
        characterData.characterBio,
        characterData.characterHeight,
        characterData.characterWeight,
        characterData.characterHandedness,
        characterData.profileImageUrl,
        characterId
      );
      
      // Update character stats
      if (characterData.characterType === 'hockey') {
        // Check if stats exist
        const statsExist = db.prepare('SELECT id FROM character_stats WHERE character_id = ?').get(characterId);
        
        if (statsExist) {
          const statsUpdate = db.prepare(`
            UPDATE character_stats SET
              stat_speed = ?,
              stat_shooting = ?,
              stat_passing = ?,
              stat_defense = ?,
              stat_checking = ?,
              stat_endurance = ?,
              stat_glove = ?,
              stat_positioning = ?,
              stat_games = ?,
              stat_goals = ?,
              stat_assists = ?,
              stat_plus_minus = ?,
              stat_pim = ?,
              stat_toi = ?
            WHERE character_id = ?
          `);
          
          statsUpdate.run(
            characterData.statSpeed || 75,
            characterData.statShooting || 75,
            characterData.statPassing || 75,
            characterData.statDefense || 75,
            characterData.statChecking || 75,
            characterData.statEndurance || 75,
            characterData.statGlove || 75,
            characterData.statPositioning || 75,
            characterData.statGames || 0,
            characterData.statGoals || 0,
            characterData.statAssists || 0,
            characterData.statPlusMinus || 0,
            characterData.statPIM || 0,
            characterData.statTOI || 0,
            characterId
          );
        } else {
          // Insert new stats if they don't exist
          const statsInsert = db.prepare(`
            INSERT INTO character_stats (
              character_id, stat_speed, stat_shooting, stat_passing, 
              stat_defense, stat_checking, stat_endurance, 
              stat_glove, stat_positioning, stat_games, 
              stat_goals, stat_assists, stat_plus_minus, 
              stat_pim, stat_toi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          statsInsert.run(
            characterId,
            characterData.statSpeed || 75,
            characterData.statShooting || 75,
            characterData.statPassing || 75,
            characterData.statDefense || 75,
            characterData.statChecking || 75,
            characterData.statEndurance || 75,
            characterData.statGlove || 75,
            characterData.statPositioning || 75,
            characterData.statGames || 0,
            characterData.statGoals || 0,
            characterData.statAssists || 0,
            characterData.statPlusMinus || 0,
            characterData.statPIM || 0,
            characterData.statTOI || 0
          );
        }
      }
      
      // Update character background
      // Check if background exists
      const backgroundExists = db.prepare('SELECT id FROM character_backgrounds WHERE character_id = ?').get(characterId);
      
      if (backgroundExists) {
        const backgroundUpdate = db.prepare(`
          UPDATE character_backgrounds SET
            birthplace = ?,
            education = ?,
            background = ?,
            hobbies = ?,
            goals = ?,
            ethnicity = ?,
            hair = ?,
            eyes = ?,
            appearance = ?,
            personality = ?,
            face_reference = ?
          WHERE character_id = ?
        `);
        
        backgroundUpdate.run(
          characterData.characterBirthplace,
          characterData.characterEducation,
          characterData.characterBackground,
          characterData.characterHobbies,
          characterData.characterGoals,
          characterData.characterEthnicity,
          characterData.characterHair,
          characterData.characterEyes,
          characterData.characterAppearance,
          characterData.characterPersonality,
          characterData.characterFaceReference,
          characterId
        );
      } else {
        // Insert new background if it doesn't exist
        const backgroundInsert = db.prepare(`
          INSERT INTO character_backgrounds (
            character_id, birthplace, education, background, 
            hobbies, goals, ethnicity, hair, 
            eyes, appearance, personality, face_reference
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        backgroundInsert.run(
          characterId,
          characterData.characterBirthplace,
          characterData.characterEducation,
          characterData.characterBackground,
          characterData.characterHobbies,
          characterData.characterGoals,
          characterData.characterEthnicity,
          characterData.characterHair,
          characterData.characterEyes,
          characterData.characterAppearance,
          characterData.characterPersonality,
          characterData.characterFaceReference
        );
      }
      
      // Add new images if any
      if (characterData.additionalImages && characterData.additionalImages.length > 0) {
        const imageInsert = db.prepare(`
          INSERT INTO character_images (
            character_id, image_url, is_profile
          ) VALUES (?, ?, ?)
        `);
        
        characterData.additionalImages.forEach(imageUrl => {
          imageInsert.run(characterId, imageUrl, 0);
        });
      }
      
      // Update profile image in the images table if provided
      if (characterData.profileImageUrl) {
        // Check if profile image exists
        const profileImageExists = db.prepare('SELECT id FROM character_images WHERE character_id = ? AND is_profile = 1').get(characterId);
        
        if (profileImageExists) {
          const profileImageUpdate = db.prepare(`
            UPDATE character_images SET
              image_url = ?
            WHERE character_id = ? AND is_profile = 1
          `);
          
          profileImageUpdate.run(characterData.profileImageUrl, characterId);
        } else {
          const profileImageInsert = db.prepare(`
            INSERT INTO character_images (
              character_id, image_url, is_profile
            ) VALUES (?, ?, ?)
          `);
          
          profileImageInsert.run(characterId, characterData.profileImageUrl, 1);
        }
      }
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      return characterId;
    } catch (err) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw err;
    }
  }

  /**
   * Get a character by ID
   */
  static getById(characterId) {
    const db = getDb();
    
    // Get character basic info
    const character = db.prepare(`
      SELECT * FROM characters WHERE id = ?
    `).get(characterId);
    
    if (!character) {
      return null;
    }
    
    // Get character stats
    const stats = db.prepare(`
      SELECT * FROM character_stats WHERE character_id = ?
    `).get(characterId);
    
    // Get character background
    const background = db.prepare(`
      SELECT * FROM character_backgrounds WHERE character_id = ?
    `).get(characterId);
    
    // Get character images
    const images = db.prepare(`
      SELECT * FROM character_images WHERE character_id = ?
    `).all(characterId);
    
    // Get team info if applicable
    let team = null;
    if (character.character_team) {
      team = db.prepare(`
        SELECT * FROM teams WHERE team_code = ?
      `).get(character.character_team);
    }
    
    // Format character object
    return {
      ...character,
      stats: stats || {},
      background: background || {},
      images: images || [],
      team: team
    };
  }

  /**
   * Get all characters
   */
  static getAll(filters = {}) {
    const db = getDb();
    
    let query = `
      SELECT c.*, 
             t.team_name, t.team_logo_url, 
             cs.stat_speed, cs.stat_shooting, cs.stat_passing, 
             cs.stat_goals, cs.stat_assists
      FROM characters c
      LEFT JOIN teams t ON c.character_team = t.team_code
      LEFT JOIN character_stats cs ON c.id = cs.character_id
    `;
    
    const queryParams = [];
    
    // Apply filters if provided
    if (Object.keys(filters).length > 0) {
      query += ' WHERE 1=1';
      
      if (filters.team && filters.team !== 'all') {
        query += ' AND c.character_team = ?';
        queryParams.push(filters.team);
      }
      
      if (filters.position && filters.position !== 'all') {
        query += ' AND c.character_position = ?';
        queryParams.push(filters.position);
      }
      
      if (filters.status && filters.status !== 'all') {
        query += ' AND c.character_status = ?';
        queryParams.push(filters.status);
      }
      
      if (filters.type && filters.type !== 'all') {
        query += ' AND c.character_type = ?';
        queryParams.push(filters.type);
      }
      
      if (filters.search) {
        query += ' AND (c.character_name LIKE ? OR c.character_position LIKE ? OR c.character_bio LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }
    }
    
    query += ' ORDER BY c.character_name ASC';
    
    return db.prepare(query).all(...queryParams);
  }

  /**
   * Get characters by team
   */
  static getByTeam(teamCode) {
    return this.getAll({ team: teamCode });
  }

  /**
   * Delete a character
   */
  static delete(characterId) {
    const db = getDb();
    
    try {
      // Start transaction
      db.prepare('BEGIN').run();
      
      // Delete character stats
      db.prepare('DELETE FROM character_stats WHERE character_id = ?').run(characterId);
      
      // Delete character background
      db.prepare('DELETE FROM character_backgrounds WHERE character_id = ?').run(characterId);
      
      // Delete character images
      db.prepare('DELETE FROM character_images WHERE character_id = ?').run(characterId);
      
      // Delete character relationships
      db.prepare('DELETE FROM character_relationships WHERE character_id = ? OR related_character_id = ?').run(characterId, characterId);
      
      // Delete character from scenarios
      db.prepare('DELETE FROM scenario_participants WHERE character_id = ?').run(characterId);
      
      // Delete character
      db.prepare('DELETE FROM characters WHERE id = ?').run(characterId);
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      return true;
    } catch (err) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw err;
    }
  }
}

module.exports = Character;