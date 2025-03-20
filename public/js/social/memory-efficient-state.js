// Memory Efficient State Management for Social Module
export class FlexibleSocialState {
  constructor() {
    // Initialize state with more generous limits
    this._state = {
      users: {}, // Store multiple users' data
      currentUser: null,
      globalSettings: {
        maxCharactersPerUser: 50, // Increased to accommodate more characters
        maxRecentPosts: 100,
        maxNotifications: 200
      }
    };
  }

  // Add a new user to the state
  addUser(userId) {
    if (!this._state.users[userId]) {
      this._state.users[userId] = {
        id: userId,
        characters: [],
        currentCharacter: null,
        preferences: {},
        feedState: {
          currentFeed: 'all',
          currentHashtag: null,
          pagination: {
            lastPage: 1,
            isLoadingMore: false
          }
        }
      };
    }
    return this._state.users[userId];
  }

  // Set the current active user
  setCurrentUser(userId) {
    if (this._state.users[userId]) {
      this._state.currentUser = userId;
      return this._state.users[userId];
    }
    throw new Error(`User ${userId} not found`);
  }

  // Add characters for a specific user
  addCharacters(userId, characters) {
    const user = this._state.users[userId];
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Limit characters while preserving most recent
    const maxCharacters = this._state.globalSettings.maxCharactersPerUser;
    user.characters = [
      ...user.characters.slice(Math.max(user.characters.length - maxCharacters, 0)),
      ...characters
    ];

    return user.characters;
  }

  // Set current character for a user
  setCurrentCharacter(userId, characterId) {
    const user = this._state.users[userId];
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const character = user.characters.find(c => c.id === characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found for user ${userId}`);
    }

    user.currentCharacter = character;
    return character;
  }

  // Update feed state for current user
  updateFeedState(userId, updates) {
    const user = this._state.users[userId];
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    user.feedState = {
      ...user.feedState,
      ...updates
    };

    return user.feedState;
  }

  // Get current user's state
  getCurrentUserState() {
    if (!this._state.currentUser) {
      throw new Error('No current user set');
    }
    return this._state.users[this._state.currentUser];
  }

  // Clear specific user's state
  clearUserState(userId) {
    if (this._state.users[userId]) {
      this._state.users[userId] = {
        id: userId,
        characters: [],
        currentCharacter: null,
        preferences: {},
        feedState: {
          currentFeed: 'all',
          currentHashtag: null,
          pagination: {
            lastPage: 1,
            isLoadingMore: false
          }
        }
      };
    }
  }

  // Reset entire state
  reset() {
    this._state = {
      users: {},
      currentUser: null,
      globalSettings: this._state.globalSettings
    };
  }

  // Debug method to get full state
  getDebugState() {
    return this._state;
  }
}

// Singleton instance
export const socialState = new FlexibleSocialState();