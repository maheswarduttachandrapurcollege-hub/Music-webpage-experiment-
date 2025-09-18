// Ultra-optimized JavaScript for maximum performance + Background Playback
'use strict';

// Global state - minimal and efficient
let player = null;
let songQueue = [];
let currentIndex = -1;
let apiReady = false;
let isLoading = false;
let wakeLock = null; // Screen Wake Lock API
let audioContext = null; // Web Audio Context to prevent tab suspension

// API Configuration
const API_KEY = "AIzaSyCHd0jZWIldZtpl0UzbJUs4dcPO2ZmA-Ho";
const MAX_RESULTS = 12; // Reduced for faster loading

// Quick queries for instant loading
const QUICK_QUERIES = [
  "trending music", "top hits", "popular songs", "latest music",
  "bollywood hits", "english songs", "party music", "chill music"
];

// Background playback prevention system
function initializeBackgroundPlayback() {
  // Create audio context to prevent tab suspension
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('Audio context initialized for background playback');
  } catch (error) {
    console.warn('AudioContext not supported:', error);
  }

  // Request screen wake lock to keep tab active
  requestWakeLock();

  // Prevent tab suspension with visibility change handling
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Keep tab alive with minimal interval
  setInterval(keepTabAlive, 30000); // Every 30 seconds

  // Create notification element dynamically
  createNotificationElement();
}

// Create notification element
function createNotificationElement() {
  if (document.getElementById('background-notification')) return;
  
  const notification = document.createElement('div');
  notification.id = 'background-notification';
  notification.className = 'notification hidden';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">🎵</div>
      <div class="notification-text">
        <strong>Background Playback Active</strong>
        <p>Music will continue playing in other tabs</p>
      </div>
      <button class="notification-close" onclick="hideNotification()">×</button>
    </div>
  `;
  document.body.appendChild(notification);
}

// Handle visibility changes
function handleVisibilityChange() {
  if (document.hidden) {
    // Tab is hidden - ensure playback continues
    console.log('Tab hidden - maintaining playback');
    if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
      // Force continue playback
      setTimeout(() => {
        if (player && document.hidden) {
          try {
            // Re-trigger play if needed
            const currentTime = player.getCurrentTime();
            player.seekTo(currentTime, true);
          } catch (error) {
            console.warn('Error maintaining playback:', error);
          }
        }
      }, 1000);
    }
  } else {
    // Tab is visible again
    console.log('Tab visible - playback restored');
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }
}

// Keep tab alive function
function keepTabAlive() {
  if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
    // Small operation to keep tab active
    performance.now();
  }
}

// Request screen wake lock
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen wake lock activated');
      
      wakeLock.addEventListener('release', () => {
        console.log('Screen wake lock released');
      });
    } catch (error) {
      console.warn('Wake lock not supported or failed:', error);
    }
  }
}

// Release wake lock when not needed
function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// Show notification for background playback
function showBackgroundNotification() {
  const notification = document.getElementById('background-notification');
  if (notification) {
    notification.classList.remove('hidden');
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideNotification();
    }, 5000);
  }
}

// Hide notification
function hideNotification() {
  const notification = document.getElementById('background-notification');
  if (notification) {
    notification.classList.add('hidden');
  }
}

// YouTube API Ready with background playback setup
function onYouTubeIframeAPIReady() {
  apiReady = true;
  try {
    player = new YT.Player('yt-player', {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
        start: 0,
        // Important for background playback
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onStateChange: handlePlayerStateChange,
        onReady: () => {
          console.log('Player ready');
          // Initialize background playback after player is ready
          initializeBackgroundPlayback();
        }
      }
    });
  } catch (error) {
    console.error('YouTube player error:', error);
  }
}

// Enhanced player state change handling
function handlePlayerStateChange(event) {
  const state = event.data;
  
  switch (state) {
    case YT.PlayerState.PLAYING:
      console.log('Playback started');
      // Ensure audio context is running
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      // Request wake lock when playing
      if (!wakeLock) {
        requestWakeLock();
      }
      break;
      
    case YT.PlayerState.PAUSED:
      console.log('Playback paused');
      break;
      
    case YT.PlayerState.ENDED:
      console.log('Track ended - playing next');
      setTimeout(() => playNext(), 100);
      break;
      
    case YT.PlayerState.BUFFERING:
      console.log('Buffering...');
      break;
  }
}

// Ultra-fast DOM queries (cached)
const elements = {};
function getElement(id) {
  if (!elements[id]) {
    elements[id] = document.getElementById(id);
  }
  return elements[id];
}

// Optimized search with immediate feedback
let searchTimer = null;
function handleSearch(query = null) {
  const searchInput = getElement('search');
  const searchQuery = query || searchInput.value.trim();
  
  if (!searchQuery || isLoading) return;
  
  // Clear previous timer
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  
  // Immediate UI feedback
  showLoading();
  
  // Debounced search
  searchTimer = setTimeout(() => {
    loadSongs(searchQuery);
  }, 200); // Reduced debounce time
}

// Ultra-fast song loading
async function loadSongs(query) {
  if (isLoading) return;
  isLoading = true;
  
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const items = data.items || [];
    
    // Immediate rendering without waiting
    requestAnimationFrame(() => {
      renderResults(items);
      if (items.length > 0) {
        setCurrentSong(items[0]);
      }
    });
    
  } catch (error) {
    console.error('Load error:', error);
    showError();
  } finally {
    isLoading = false;
  }
}

// Lightning-fast grid rendering
function renderResults(items) {
  const container = getElement('results');
  
  if (!items.length) {
    container.innerHTML = '<div class="loading">No results found</div>';
    return;
  }
  
  // Use innerHTML for fastest rendering
  const html = items.map(item => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumbnail = item.snippet.thumbnails.medium?.url || '';
    
    return `
      <div class="card" onclick="playVideo('${videoId}', '${escapeHtml(title)}', '${thumbnail}')">
        <img class="thumb" src="${thumbnail}" alt="${escapeHtml(title)}" loading="lazy">
        <div class="info">
          <h3 class="title">${escapeHtml(title)}</h3>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  songQueue = items; // Update queue
}

// Enhanced video playback with background support
function playVideo(videoId, title, thumbnail) {
  if (!apiReady || !player) return;
  
  try {
    // Immediate UI update
    updateNowPlaying(title, thumbnail);
    
    // Ensure audio context is active before playing
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        player.loadVideoById(videoId);
      });
    } else {
      player.loadVideoById(videoId);
    }
    
    // Update current index
    currentIndex = songQueue.findIndex(item => item.id.videoId === videoId);
    
    // Request wake lock for new playback
    if (!wakeLock) {
      requestWakeLock();
    }
    
    // Show background playback notification on first play
    if (currentIndex >= 0) {
      showBackgroundNotification();
    }
    
  } catch (error) {
    console.error('Play error:', error);
  }
}

// Instant UI updates
function updateNowPlaying(title, thumbnail) {
  const titleEl = getElement('song-title');
  const thumbEl = getElement('song-thumbnail');
  
  if (titleEl) titleEl.textContent = title;
  if (thumbEl && thumbnail) thumbEl.src = thumbnail;
}

function setCurrentSong(item) {
  const title = item.snippet.title;
  const thumbnail = item.snippet.thumbnails.medium?.url;
  updateNowPlaying(title, thumbnail);
  
  // Cue the first song
  if (apiReady && player) {
    try {
      player.cueVideoById(item.id.videoId);
    } catch (error) {
      console.error('Cue error:', error);
    }
  }
}

// Navigation functions
function playNext() {
  if (songQueue.length === 0) return;
  
  currentIndex = (currentIndex + 1) % songQueue.length;
  const nextSong = songQueue[currentIndex];
  
  if (nextSong) {
    playVideo(
      nextSong.id.videoId,
      nextSong.snippet.title,
      nextSong.snippet.thumbnails.medium?.url
    );
  }
}

function playPrevious() {
  if (songQueue.length === 0) return;
  
  currentIndex = currentIndex <= 0 ? songQueue.length - 1 : currentIndex - 1;
  const prevSong = songQueue[currentIndex];
  
  if (prevSong) {
    playVideo(
      prevSong.id.videoId,
      prevSong.snippet.title,
      prevSong.snippet.thumbnails.medium?.url
    );
  }
}

// UI State management
function showLoading() {
  const container = getElement('results');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading...</span></div>';
}

function showError() {
  const container = getElement('results');
  container.innerHTML = '<div class="loading">Failed to load. Please try again.</div>';
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Tab switching - instant
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show target tab
  const targetTab = getElement(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });
}

// Event listeners - optimized
document.addEventListener('DOMContentLoaded', function() {
  // Search functionality
  const searchBtn = getElement('search-btn');
  const searchInput = getElement('search');
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => handleSearch());
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
    
    // Real-time search with debouncing
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (query.length > 2) { // Only search after 3 characters
        handleSearch(query);
      }
    });
  }
  
  // Tab navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Feedback form
  const feedbackForm = getElement('feedback-form');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const statusEl = getElement('feedback-status');
      if (statusEl) {
        statusEl.textContent = 'Thanks for your feedback!';
      }
      feedbackForm.reset();
    });
  }
  
  // Load initial content immediately
  const randomQuery = QUICK_QUERIES[Math.floor(Math.random() * QUICK_QUERIES.length)];
  setTimeout(() => loadSongs(randomQuery), 100);
});

// Enhanced keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Only when not typing in input
  if (e.target.tagName === 'INPUT') return;
  
  switch(e.code) {
    case 'Space':
      e.preventDefault();
      if (player && apiReady) {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          player.pauseVideo();
        } else {
          player.playVideo();
          // Resume audio context if suspended
          if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
          }
        }
      }
      break;
    case 'ArrowRight':
      e.preventDefault();
      playNext();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      playPrevious();
      break;
  }
});

// Performance monitoring
if (window.performance) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        console.log(`Page loaded in ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`);
      }
    }, 0);
  });
}

// Enhanced cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (searchTimer) clearTimeout(searchTimer);
  if (wakeLock) releaseWakeLock();
  if (audioContext) {
    audioContext.close();
  }
  if (player) player.destroy();
});

// Handle page focus/blur for better background playback
window.addEventListener('focus', () => {
  console.log('Window focused');
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
});

window.addEventListener('blur', () => {
  console.log('Window blurred - maintaining background playback');
});

// Global functions for onclick handlers
window.playVideo = playVideo;
window.playNext = playNext;
window.playPrevious = playPrevious;
window.hideNotification = hideNotification;