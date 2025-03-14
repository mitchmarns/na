// character-manager.js - Handles character creation, editing, and management

/**
 * Character Manager - Handles all character-related operations
 */
class CharacterManager {
  constructor() {
    // Store for character data (in a real app, this would be server-side)
    this.characters = [];
    this.teams = [
      { id: 'wolves', name: 'Wolves' },
      { id: 'eagles', name: 'Eagles' },
      { id: 'bears', name: 'Bears' },
      { id: 'falcons', name: 'Falcons' },
      { id: 'none', name: 'No Team / Free Agent' }
    ];
    
    // Character types
    this.characterTypes = [
      { id: 'hockey', name: 'Hockey Player' },
      { id: 'staff', name: 'Team Staff' },
      { id: 'family', name: 'Family Member' },
      { id: 'other', name: 'Other Character' }
    ];
    
    // Hockey positions
    this.positions = [
      { id: 'center', name: 'Center' },
      { id: 'leftwing', name: 'Left Wing' },
      { id: 'rightwing', name: 'Right Wing' },
      { id: 'defense', name: 'Defense' },
      { id: 'goalie', name: 'Goalie' },
      { id: 'coach', name: 'Coach' },
      { id: 'staff', name: 'Other Staff' }
    ];
    
    // Player statuses
    this.statuses = [
      { id: 'active', name: 'Active' },
      { id: 'injured', name: 'Injured' },
      { id: 'prospect', name: 'Prospect' },
      { id: 'retired', name: 'Retired' }
    ];
    
    // Initialize event listeners
    this.initEventListeners();
  }
  
  /**
   * Set up event listeners for character forms
   */
  initEventListeners() {
    // Check if we're on a character form page
    const characterForm = document.getElementById('characterForm');
    
    if (characterForm) {
      characterForm.addEventListener('submit', (e) => this.handleCharacterFormSubmit(e));
      
      // Dynamic form field logic
      const characterTypeSelect = document.getElementById('characterType');
      if (characterTypeSelect) {
        characterTypeSelect.addEventListener('change', () => this.handleCharacterTypeChange());
      }
      
      const positionSelect = document.getElementById('characterPosition');
      if (positionSelect) {
        positionSelect.addEventListener('change', () => this.handlePositionChange());
      }
      
      // Initialize file upload previews
      this.initFileUploadPreviews();
      
      // If editing, load character data
      const characterId = this.getUrlParameter('id');
      if (characterId && characterId !== 'new') {
        this.loadCharacterForEditing(characterId);
      }
    }
    
    // Character gallery modal
    const galleryItems = document.querySelectorAll('.gallery-item');
    if (galleryItems.length > 0) {
      this.initGalleryModal(galleryItems);
    }
  }
  
  /**
   * Handle form submission for character creation/editing
   */
  handleCharacterFormSubmit(e) {
    e.preventDefault();
    
    // Validate the form
    if (!this.validateCharacterForm()) {
      return;
    }
    
    // Collect form data
    const formData = new FormData(e.target);
    const characterData = {};
    
    for (const [key, value] of formData.entries()) {
      // Don't include file inputs directly
      if (key !== 'profileImage' && key !== 'additionalImages') {
        characterData[key] = value;
      }
    }
    
    // Handle file uploads separately
    const profileImage = document.getElementById('profileImage').files[0];
    if (profileImage) {
      // In a real app, we would upload the file to the server
      // For now, we'll store the file name
      characterData.profileImageUrl = `images/characters/${profileImage.name}`;
    }
    
    // Get character ID (if editing)
    const characterId = this.getUrlParameter('id');
    
    if (characterId && characterId !== 'new') {
      // Update existing character
      characterData.id = characterId;
      this.updateCharacter(characterData);
    } else {
      // Create new character
      characterData.id = this.generateCharacterId();
      this.createCharacter(characterData);
    }
    
    // Redirect to character profile
    window.location.href = `character-profile.html?id=${characterData.id}`;
  }
  
  /**
   * Validate the character form before submission
   */
  validateCharacterForm() {
    let isValid = true;
    
    // Remove any existing error messages
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(message => message.remove());
    
    // Required fields
    const requiredFields = [
      { id: 'characterName', message: 'Character name is required' },
      { id: 'characterAge', message: 'Age is required' },
      { id: 'characterGender', message: 'Gender is required' },
      { id: 'characterType', message: 'Character type is required' }
    ];
    
    requiredFields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input && (!input.value || input.value.trim() === '')) {
        this.addErrorMessage(input, field.message);
        isValid = false;
      }
    });
    
    // Character type specific validation
    const characterType = document.getElementById('characterType').value;
    
    if (characterType === 'hockey') {
      // Hockey player specific required fields
      const hockeyRequiredFields = [
        { id: 'characterTeam', message: 'Team is required' },
        { id: 'characterPosition', message: 'Position is required' },
        { id: 'characterNumber', message: 'Jersey number is required' }
      ];
      
      hockeyRequiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (input && (!input.value || input.value.trim() === '')) {
          this.addErrorMessage(input, field.message);
          isValid = false;
        }
      });
    } else if (characterType === 'family' || characterType === 'other') {
      // Related character validation
      const relatedCharacter = document.getElementById('relatedCharacter');
      const relationshipType = document.getElementById('relationshipType');
      
      if ((!relatedCharacter.value || relatedCharacter.value.trim() === '') && 
          (!relationshipType.value || relationshipType.value.trim() === '')) {
        this.addErrorMessage(relatedCharacter, 'Please select a related character and relationship type');
        isValid = false;
      }
    }
    
    // Profile image is required
    const profileImage = document.getElementById('profileImage');
    if (profileImage && profileImage.files.length === 0 && !this.getUrlParameter('id')) {
      this.addErrorMessage(profileImage.parentElement, 'Profile image is required');
      isValid = false;
    }
    
    return isValid;
  }
  
  /**
   * Add an error message to a form field
   */
  addErrorMessage(element, message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    
    element.parentNode.appendChild(errorMessage);
    element.classList.add('error');
  }
  
  /**
   * Handle character type change
   */
  handleCharacterTypeChange() {
    const characterType = document.getElementById('characterType').value;
    const hockeyFields = document.querySelector('.hockey-specific-fields');
    const relationshipFields = document.querySelector('.relationship-fields');
    
    // Show/hide relevant sections
    if (characterType === 'hockey' || characterType === 'staff') {
      hockeyFields.style.display = 'block';
      relationshipFields.style.display = 'none';
    } else if (characterType === 'family' || characterType === 'other') {
      hockeyFields.style.display = 'none';
      relationshipFields.style.display = 'block';
    } else {
      hockeyFields.style.display = 'none';
      relationshipFields.style.display = 'none';
    }
    
    // Show/hide form tabs based on character type
    const hockeyTab = document.querySelector('.form-tab[data-tab="hockey"]');
    
    if (characterType === 'hockey') {
      hockeyTab.style.display = 'block';
    } else {
      hockeyTab.style.display = 'none';
      
      // If currently on the hockey tab, switch to basic info
      if (hockeyTab.classList.contains('active')) {
        document.querySelector('.form-tab[data-tab="basic"]').click();
      }
    }
  }
  
  /**
   * Handle position change
   */
  handlePositionChange() {
    const position = document.getElementById('characterPosition').value;
    const goalieStats = document.querySelector('.goalie-stats');
    const goalieSeasonStats = document.querySelector('.goalie-season-stats');
    const skaterStats = document.querySelector('.skater-stats');
    
    if (position === 'goalie') {
      goalieStats.style.display = 'block';
      goalieSeasonStats.style.display = 'block';
      skaterStats.style.display = 'none';
    } else {
      goalieStats.style.display = 'none';
      goalieSeasonStats.style.display = 'none';
      skaterStats.style.display = 'block';
    }
  }
  
  /**
   * Initialize file upload previews
   */
  initFileUploadPreviews() {
    const profileImage = document.getElementById('profileImage');
    const profileImagePreview = document.getElementById('profileImagePreview');
    const additionalImages = document.getElementById('additionalImages');
    const additionalImagesPreview = document.getElementById('additionalImagesPreview');
    
    if (profileImage && profileImagePreview) {
      profileImage.addEventListener('change', function() {
        const file = this.files[0];
        
        if (file) {
          const reader = new FileReader();
          
          reader.onload = function(e) {
            profileImagePreview.innerHTML = `<img src="${e.target.result}" alt="Profile preview">`;
          };
          
          reader.readAsDataURL(file);
          
          // Update file name display
          this.parentElement.querySelector('.file-name').textContent = file.name;
        }
      });
    }
    
    if (additionalImages && additionalImagesPreview) {
      additionalImages.addEventListener('change', function() {
        additionalImagesPreview.innerHTML = '';
        
        if (this.files.length > 0) {
          for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const reader = new FileReader();
            
            reader.onload = function(e) {
              const img = document.createElement('img');
              img.src = e.target.result;
              img.alt = `Additional image ${i+1}`;
              additionalImagesPreview.appendChild(img);
            };
            
            reader.readAsDataURL(file);
          }
          
          // Update file name display
          this.parentElement.querySelector('.file-name').textContent = `${this.files.length} files selected`;
        } else {
          this.parentElement.querySelector('.file-name').textContent = 'No files chosen';
        }
      });
    }
  }
  
  /**
   * Initialize gallery modal for character profile
   */
  initGalleryModal(galleryItems) {
    const modalContainer = document.querySelector('.modal-container');
    
    if (!modalContainer) return;
    
    galleryItems.forEach(item => {
      item.addEventListener('click', function() {
        const imgSrc = this.querySelector('img').src;
        const modalImg = modalContainer.querySelector('.modal-image');
        
        if (modalImg) {
          modalImg.src = imgSrc;
          modalContainer.style.display = 'flex';
        }
      });
    });
    
    // Close modal when clicking outside image
    modalContainer.addEventListener('click', function(e) {
      if (e.target === modalContainer) {
        modalContainer.style.display = 'none';
      }
    });
  }
  
  /**
   * Load character data for editing
   */
  loadCharacterForEditing(characterId) {
    // In a real app, this would fetch data from the server
    // For now, we'll simulate with mock data
    const character = this.getCharacterById(characterId);
    
    if (!character) {
      alert('Character not found');
      window.location.href = 'characters.html';
      return;
    }
    
    // Fill form fields with character data
    Object.keys(character).forEach(key => {
      const input = document.getElementById(key);
      
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = character[key];
        } else {
          input.value = character[key];
        }
      }
    });
    
    // Handle character type specific fields
    this.handleCharacterTypeChange();
    
    // Handle position specific fields
    if (character.characterPosition === 'goalie') {
      this.handlePositionChange();
    }
    
    // Set profile image preview if available
    if (character.profileImageUrl) {
      const profileImagePreview = document.getElementById('profileImagePreview');
      
      if (profileImagePreview) {
        profileImagePreview.innerHTML = `<img src="${character.profileImageUrl}" alt="Character profile">`;
      }
    }
    
    // Update page title
    document.title = `Edit ${character.characterName} - Hockey Roleplay Hub`;
    
    // Update page header
    const pageHeader = document.querySelector('.section-header h1');
    if (pageHeader) {
      pageHeader.textContent = `Edit Character: ${character.characterName}`;
    }
    
    // Update submit button
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Update Character';
    }
  }
  
  /**
   * Create a new character
   */
  createCharacter(characterData) {
    // In a real app, this would send data to the server
    // For now, we'll just add to our local array
    this.characters.push(characterData);
    
    // Simulate saving to localStorage (for demo purposes)
    this.saveCharacters();
    
    return characterData;
  }
  
  /**
   * Update an existing character
   */
  updateCharacter(characterData) {
    // In a real app, this would send data to the server
    // For now, we'll update our local array
    const index = this.characters.findIndex(c => c.id === characterData.id);
    
    if (index !== -1) {
      this.characters[index] = characterData;
      
      // Simulate saving to localStorage (for demo purposes)
      this.saveCharacters();
    }
    
    return characterData;
  }
  
  /**
   * Delete a character
   */
  deleteCharacter(characterId) {
    // In a real app, this would send a delete request to the server
    // For now, we'll remove from our local array
    this.characters = this.characters.filter(c => c.id !== characterId);
    
    // Simulate saving to localStorage (for demo purposes)
    this.saveCharacters();
  }
  
  /**
   * Get a character by ID
   */
  getCharacterById(characterId) {
    // In a real app, this would fetch from the server
    // Load characters from localStorage (for demo purposes)
    this.loadCharacters();
    
    return this.characters.find(c => c.id === characterId);
  }
  
  /**
   * Get all characters
   */
  getAllCharacters() {
    // In a real app, this would fetch from the server
    // Load characters from localStorage (for demo purposes)
    this.loadCharacters();
    
    return this.characters;
  }
  
  /**
   * Get characters by team
   */
  getCharactersByTeam(teamId) {
    return this.getAllCharacters().filter(c => c.characterTeam === teamId);
  }
  
  /**
   * Generate a unique character ID
   */
  generateCharacterId() {
    return 'char_' + Date.now();
  }
  
  /**
   * Save characters to localStorage (for demo purposes)
   */
  saveCharacters() {
    localStorage.setItem('hockeyRPCharacters', JSON.stringify(this.characters));
  }
  
  /**
   * Load characters from localStorage (for demo purposes)
   */
  loadCharacters() {
    const savedCharacters = localStorage.getItem('hockeyRPCharacters');
    
    if (savedCharacters) {
      this.characters = JSON.parse(savedCharacters);
    }
  }
  
  /**
   * Get URL parameter by name
   */
  getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
}

// Initialize the character manager
document.addEventListener('DOMContentLoaded', () => {
  window.characterManager = new CharacterManager();
});