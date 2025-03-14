// main.js - Core JavaScript functionality for Hockey Roleplay Hub

document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
    });
  }
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', function(event) {
    if (navMenu && navMenu.classList.contains('active') && !navMenu.contains(event.target) && event.target !== menuToggle) {
      navMenu.classList.remove('active');
    }
  });
  
  // Handle dropdowns on mobile
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    const link = dropdown.querySelector('.nav-link');
    
    // For mobile: toggle dropdown on click
    if (link) {
      link.addEventListener('click', function(e) {
        // Only prevent default on mobile
        if (window.innerWidth <= 768) {
          e.preventDefault();
          dropdown.classList.toggle('active');
          
          // Close other dropdowns
          dropdowns.forEach(otherDropdown => {
            if (otherDropdown !== dropdown && otherDropdown.classList.contains('active')) {
              otherDropdown.classList.remove('active');
            }
          });
        }
      });
    }
  });
  
  // Profile tabs functionality
  const profileTabs = document.querySelectorAll('.profile-tab');
  const profileContents = document.querySelectorAll('.profile-content');
  
  if (profileTabs.length > 0 && profileContents.length > 0) {
    profileTabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        profileTabs.forEach(t => t.classList.remove('active'));
        profileContents.forEach(c => c.style.display = 'none');
        
        // Add active class to current tab and show corresponding content
        tab.classList.add('active');
        if (profileContents[index]) {
          profileContents[index].style.display = 'block';
        }
      });
    });
    
    // Show first tab by default
    if (profileTabs[0] && profileContents[0]) {
      profileTabs[0].classList.add('active');
      profileContents[0].style.display = 'block';
    }
  }
  
  // Character search functionality
  const characterSearch = document.getElementById('characterSearch');
  const characterCards = document.querySelectorAll('.character-card');
  
  if (characterSearch && characterCards.length > 0) {
    characterSearch.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase().trim();
      
      characterCards.forEach(card => {
        const characterName = card.querySelector('.character-name').textContent.toLowerCase();
        const characterPosition = card.querySelector('.character-position').textContent.toLowerCase();
        const characterBio = card.querySelector('.character-bio')?.textContent.toLowerCase() || '';
        
        // Check if any of the character info contains the search term
        if (characterName.includes(searchTerm) || 
            characterPosition.includes(searchTerm) || 
            characterBio.includes(searchTerm)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
  
  // Filter functionality
  const filterForms = document.querySelectorAll('.character-filters form');
  
  filterForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(form);
      const filters = {};
      
      // Build filter object
      for (const [key, value] of formData.entries()) {
        if (value) {
          filters[key] = value;
        }
      }
      
      // Apply filters to character cards
      characterCards.forEach(card => {
        let showCard = true;
        
        // Check each filter against card data attributes
        for (const [key, value] of Object.entries(filters)) {
          if (card.dataset[key] !== value && value !== 'all') {
            showCard = false;
            break;
          }
        }
        
        card.style.display = showCard ? '' : 'none';
      });
    });
    
    // Reset button functionality
    const resetButton = form.querySelector('.filter-reset');
    if (resetButton) {
      resetButton.addEventListener('click', function() {
        form.reset();
        
        // Show all cards
        characterCards.forEach(card => {
          card.style.display = '';
        });
      });
    }
  });
  
  // Gallery image modal
  const galleryItems = document.querySelectorAll('.gallery-item');
  const modalContainer = document.querySelector('.modal-container');
  
  if (galleryItems.length > 0 && modalContainer) {
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
    if (modalContainer) {
      modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
          modalContainer.style.display = 'none';
        }
      });
    }
  }
});

// Helper Functions

// Format date for display (e.g., "Mar 15, 2025")
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get URL parameters (for dynamic pages)
function getURLParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Load character data (example of data loading, would connect to backend in production)
function loadCharacterData(characterId) {
  // In a real application, this would be an API call
  // For now, we'll simulate with local data
  return {
    id: characterId,
    name: "Example Character",
    position: "Center",
    number: 87,
    team: "Wolves",
    stats: {
      goals: 32,
      assists: 45,
      games: 78
    },
    bio: "This is an example character bio."
  };
}

// Load character list
function loadCharacters() {
  // In a real application, this would be an API call
  // For demonstration, we're not implementing actual data loading
  console.log("Characters would be loaded here from a database");
}