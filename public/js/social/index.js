// social/index.js - Updated with new state management
import { socialState } from './memory-efficient-state.js';
import { performanceTracker } from './performance-tracker.js';
import { apiCacheManager } from './api-cache-manager.js';

// Import all modules
import * as character from './character.js';
import * as feed from './feed.js';
import * as post from './post.js';
import * as comments from './comments.js';
import * as interactions from './interactions.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as hashtags from './hashtags.js';
import * as notifications from './notifications.js';

// Initialize the application
export function init() {
  // Check authentication
  window.authUtils.checkAuth(true);
  window.authUtils.setupLogoutButton();

  // Get current user from local/session storage
  const currentUser = JSON.parse(
    localStorage.getItem('authInfo') || 
    sessionStorage.getItem('authInfo') || 
    'null'
  );

  if (currentUser && currentUser.id) {
    // Add user to state
    const userState = socialState.addUser(currentUser.id);
    socialState.setCurrentUser(currentUser.id);

    // Initialize global app state
    window.socialApp = {
      state: socialState,
      apiCache: apiCacheManager,
      currentUser: userState
    };

    // Load user's characters
    loadUserCharacters(currentUser.id);
  } else {
    console.error('No authenticated user found');
    // Redirect to login or handle unauthenticated state
    window.location.href = '/login.html';
  }

  // Initialize all modules
  initializeModules();

  // Set up infinite scroll
  setupInfiniteScroll();
}

// Load user's characters
async function loadUserCharacters(userId) {
  try {
    const characters = await api.fetchCharacters();
    
    // Add characters to user state
    socialState.addCharacters(userId, characters);

    // Set first character as current if available
    if (characters.length > 0) {
      socialState.setCurrentCharacter(userId, characters[0].id);
    }

    // Trigger further initialization
    character.init(socialState);
    feed.loadFeed('all', 1);
  } catch (error) {
    console.error('Failed to load characters:', error);
  }
}

// Initialize all modules
function initializeModules() {
  // Initialize modules with the new state management
  feed.init(socialState);
  post.init(socialState);
  comments.init(socialState);
  interactions.init(socialState);
  ui.init(socialState);
  hashtags.init(socialState);
  notifications.init(socialState);

  // Additional supporting content
  api.loadNotificationsCount(socialState.getCurrentUserState().currentCharacter?.id);
  api.loadTrendingHashtags();
  api.loadSuggestedFollows(socialState.getCurrentUserState().currentCharacter?.id);
  api.loadUpcomingGames();

  // Log initialization
  performanceTracker.logMetric('Social Module Initialized');
}

// Set up infinite scroll
function setupInfiniteScroll() {
  window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const currentState = socialState.getCurrentUserState();
    
    if (scrollTop + clientHeight >= scrollHeight - 200 && 
        !currentState.feedState.pagination.isLoadingMore) {
      
      // Update loading state
      socialState.updateFeedState(
        socialState.getCurrentUserState().id, 
        { 'pagination.isLoadingMore': true }
      );
      
      // Load more posts
      feed.loadMorePosts();
    }
  });
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);