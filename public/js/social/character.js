// social/character.js - Updated for new state management
import * as api from './api.js';
import * as feed from './feed.js';
import * as ui from './ui.js';

// DOM elements
const elements = {
  characterSelector: document.getElementById('character-selector'),
  activeCharacterAvatar: document.getElementById('active-character-avatar'),
  activeCharacterName: document.getElementById('active-character-name'),
  activeCharacterPosition: document.getElementById('active-character-position'),
  activeCharacterTeam: document.getElementById('active-character-team'),
  composerAvatar: document.getElementById('composer-avatar'),
  composerCharacterName: document.getElementById('composer-character-name'),
  composerCharacterTeam: document.getElementById('composer-character-team'),
  modalCommentAvatar: document.getElementById('modal-comment-avatar')
};

// Initialize the character module
export function init(socialState) {
  // Set up event listeners
  setupCharacterSelector(socialState);
  
  // Populate character selector
  populateCharacterSelector(socialState);
}

// Set up character selector event listeners
function setupCharacterSelector(socialState) {
  if (!elements.characterSelector) return;

  elements.characterSelector.addEventListener('change', () => {
    const characterId = parseInt(elements.characterSelector.value);
    
    if (characterId) {
      const currentUser = socialState.getCurrentUserState();
      
      try {
        // Set current character
        const selectedCharacter = socialState.setCurrentCharacter(
          currentUser.id, 
          characterId
        );
        
        // Update UI
        updateActiveCharacter(selectedCharacter, socialState);
        
        // Reload feed for selected character
        feed.loadFeed('all', 1);
        
        // Load additional content for character
        api.loadSuggestedFollows(characterId);
      } catch (error) {
        console.error('Error selecting character:', error);
        ui.showMessage('Failed to select character', 'error');
      }
    }
  });
}

// Populate character selector dropdown
function populateCharacterSelector(socialState) {
  if (!elements.characterSelector) return;

  // Clear existing options except the first one
  while (elements.characterSelector.options.length > 1) {
    elements.characterSelector.remove(1);
  }

  const currentUser = socialState.getCurrentUserState();
  const characters = currentUser.characters;

  if (characters.length === 0) {
    elements.characterSelector.innerHTML = '<option value="">No characters found</option>';
    return;
  }

  // Add character options
  characters.forEach(character => {
    const option = document.createElement('option');
    option.value = character.id;
    option.textContent = character.name;
    option.dataset.position = character.position || '';
    option.dataset.team = character.team_name || '';
    option.dataset.avatar = character.avatar_url || '/api/placeholder/80/80';
    
    // Set current character as selected
    if (currentUser.currentCharacter && 
        currentUser.currentCharacter.id === character.id) {
      option.selected = true;
    }
    
    elements.characterSelector.appendChild(option);
  });

  // If no character was selected, choose the first one
  if (!currentUser.currentCharacter && characters.length > 0) {
    elements.characterSelector.value = characters[0].id;
    const firstCharacter = characters[0];
    updateActiveCharacter(firstCharacter, socialState);
  }
}

// Update active character display
export function updateActiveCharacter(character, socialState) {
  if (!character) return;

  // Update active character card
  if (elements.activeCharacterAvatar) {
    elements.activeCharacterAvatar.src = character.avatar_url || '/api/placeholder/80/80';
    elements.activeCharacterAvatar.alt = character.name;
  }
  
  if (elements.activeCharacterName) {
    elements.activeCharacterName.textContent = character.name;
  }
  
  if (elements.activeCharacterPosition) {
    elements.activeCharacterPosition.textContent = character.position || '';
  }
  
  if (elements.activeCharacterTeam) {
    elements.activeCharacterTeam.textContent = character.team_name || 'No Team';
  }
  
  // Update composer
  if (elements.composerAvatar) {
    elements.composerAvatar.src = character.avatar_url || '/api/placeholder/40/40';
    elements.composerAvatar.alt = character.name;
  }
  
  if (elements.composerCharacterName) {
    elements.composerCharacterName.textContent = character.name;
  }
  
  if (elements.composerCharacterTeam) {
    elements.composerCharacterTeam.textContent = character.team_name || 'No Team';
  }
  
  // Update modal comment avatar
  if (elements.modalCommentAvatar) {
    elements.modalCommentAvatar.src = character.avatar_url || '/api/placeholder/40/40';
    elements.modalCommentAvatar.alt = character.name;
  }
}

// Get selected character data
export function getSelectedCharacter(socialState) {
  const currentUser = socialState.getCurrentUserState();
  return currentUser.currentCharacter;
}