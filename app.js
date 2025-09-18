// Ultra-optimized JavaScript for Audio-Only Background Playback
'use strict';

// Global state - minimal and efficient
let player = null;
let songQueue = [];
let currentIndex = -1;
let apiReady = false;
let isLoading = false;
let isPlaying = false;
let currentVideoId = null;

// API Configuration
const API_KEY = "AIzaSyCHd0jZWIldZtpl0UzbJUs4dcPO2ZmA-Ho";
const MAX_RESULTS = 12; // Reduced for faster loading

// Quick queries for instant loading
const QUICK_QUERIES = [
  "trending music", "top hits", "popular songs", "latest music",
  "bollywood hits", "english songs", "party music", "chill music"
];

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
        <strong>Audio-Only Mode Active</strong>
        <p>Music will play in background without video</p>
      </div>
      <button class="notification-close" onclick="hideNotification()">×</button>
    </div>
  `;
  document.body.appendChild(notification);
}

// Show notification for audio-only playback
function showAudioNotification() {
  const notification = document.getElementById('background-notification');
  if (notification) {
    notification.classList.remove('hidden');
    // Auto-hide after 4 seconds
    setTimeout(() => {
      hideNotification();
    }, 4000);
  }
}

// Hide notification
function hideNotification() {
  const notification = document.getElementById('background-notification');
  if (notification) {
    notification.classList.add('hidden');
  }
}

// YouTube API Ready with audio-only setup
function onYouTubeIframeAPIReady() {
  apiReady = true;
  try {
    player = new YT.Player('yt-player', {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0, // Hide controls for audio-only
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
        start: 0,
        enablejsapi: 1,
        origin: window.location.origin,
        // Force lowest quality for audio-only
        vq: 'tiny', // Lowest quality
        hd: 0
      },
      events: {
        onStateChange: handlePlayerStateChange,
        onReady: () => {
          console.log('Audio player ready');
          // Set lowest quality immediately
          if (player.setPlaybackQuality) {
            player.setPlaybackQuality('small'); // Lowest quality
          }
          createNotificationElement();
          hideVideoPlayer();
        },
        onPlaybackQualityChange: (event) => {
          // Always force lowest quality
          console.log('Quality changed to:', event.data);
        }
      }
    });
  } catch (error) {
    console.error('YouTube player error:', error);
  }
}

// Hide video player for audio-only experience
function hideVideoPlayer() {
  const playerFrame = document.querySelector('.player-frame');
  const iframeWrap = document.querySelector('.iframe-wrap');
  
  if (playerFrame) {
    playerFrame.style.display = 'none';
  }
  
  if (iframeWrap) {
    // Keep iframe but make it invisible and tiny for audio-only
    iframeWrap.style.position = 'absolute';
    iframeWrap.style.left = '-9999px';
    iframeWrap.style.width = '1px';
    iframeWrap.style.height = '1px';
    iframeWrap.style.opacity = '0';
    iframeWrap.style.pointerEvents = 'none';
  }
}

// Enhanced player state change handling for audio-only
function handlePlayerStateChange(event) {
  const state = event.data;
  
  switch (state) {
    case YT.PlayerState.PLAYING:
      console.log('Audio playback started');
      isPlaying = true;
      updatePlayButton(true);
      // Force lowest quality when playing
      setTimeout(() => {
        if (player.setPlaybackQuality) {
          player.setPlaybackQuality('small');
        }
      }, 1000);
      break;
      
    case YT.PlayerState.PAUSED:
      console.log('Audio playback paused');
      isPlaying = false;
      updatePlayButton(false);
      break;
      
    case YT.PlayerState.ENDED:
      console.log('Track ended - playing next');
      isPlaying = false;
      setTimeout(() => playNext(), 500);
      break;
      
    case YT.PlayerState.BUFFERING:
      console.log('Buffering audio...');
      break;
      
    case YT.PlayerState.CUED:
      console.log('Audio cued and ready');
      break;
  }
}

// Update play button state
function updatePlayButton(playing) {
  const playButtons = document.querySelectorAll('.play-btn');
  playButtons.forEach(btn => {
    const icon = btn.querySelector('svg') || btn;
    if (playing) {
      // Show pause icon
      icon.innerHTML = `
        <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
        <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
      `;
    } else {
      // Show play icon
      icon.innerHTML = `
        <polygon points="5,3 19,12 5,21" fill="currentColor"/>
      `;
    }
  });
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
  }, 200);
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

// Lightning-fast grid rendering with audio controls
function renderResults(items) {
  const container = getElement('results');
  
  if (!items.length) {
    container.innerHTML = '<div class="loading">No results found</div>';
    return;
  }
  
  // Use innerHTML for fastest rendering with audio controls
  const html = items.map((item, index) => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const thumbnail = item.snippet.thumbnails.medium?.url || '';
    const isCurrentSong = currentVideoId === videoId;
    
    return `
      <div class="card ${isCurrentSong ? 'playing' : ''}" onclick="playAudio('${videoId}', '${escapeHtml(title)}', '${thumbnail}', ${index})">
        <div class="card-overlay">
          <div class="play-icon">
            ${isCurrentSong && isPlaying ? '⏸️' : '▶️'}
          </div>
        </div>
        <img class="thumb" src="${thumbnail}" alt="${escapeHtml(title)}" loading="lazy">
        <div class="info">
          <h3 class="title">${escapeHtml(title)}</h3>
          <div class="audio-badge">🎵 Audio Only</div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  songQueue = items; // Update queue
}

// Audio-only playback function
function playAudio(videoId, title, thumbnail, index = -1) {
  if (!apiReady || !player) return;
  
  try {
    console.log('Playing audio:', title);
    
    // Update UI immediately
    updateNowPlaying(title, thumbnail);
    currentVideoId = videoId;
    
    // Load video for audio-only playback
    player.loadVideoById({
      videoId: videoId,
      suggestedQuality: 'small' // Force lowest quality
    });
    
    // Update current index
    if (index >= 0) {
      currentIndex = index;
    } else {
      currentIndex = songQueue.findIndex(item => item.id.videoId === videoId);
    }
    
    // Show audio-only notification on first play
    if (currentIndex === 0 || !document.querySelector('.notification.hidden')) {
      showAudioNotification();
    }
    
    // Re-render results to update play icons
    setTimeout(() => {
      if (songQueue.length > 0) {
        renderResults(songQueue);
      }
    }, 500);
    
  } catch (error) {
    console.error('Audio play error:', error);
  }
}

// Toggle play/pause
function togglePlayback() {
  if (!player || !apiReady) return;
  
  const state = player.getPlayerState();
  
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED) {
    player.playVideo();
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
      player.cueVideoById({
        videoId: item.id.videoId,
        suggestedQuality: 'small'
      });
      currentVideoId = item.id.videoId;
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
    playAudio(
      nextSong.id.videoId,
      nextSong.snippet.title,
      nextSong.snippet.thumbnails.medium?.url,
      currentIndex
    );
  }
}

function playPrevious() {
  if (songQueue.length === 0) return;
  
  currentIndex = currentIndex <= 0 ? songQueue.length - 1 : currentIndex - 1;
  const prevSong = songQueue[currentIndex];
  
  if (prevSong) {
    playAudio(
      prevSong.id.videoId,
      prevSong.snippet.title,
      prevSong.snippet.thumbnails.medium?.url,
      currentIndex
    );
  }
}

// UI State management
function showLoading() {
  const container = getElement('results');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading songs...</span></div>';
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

// Enhanced keyboard shortcuts for audio playback
document.addEventListener('keydown', (e) => {
  // Only when not typing in input
  if (e.target.tagName === 'INPUT') return;
  
  switch(e.code) {
    case 'Space':
      e.preventDefault();
      togglePlayback();
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (searchTimer) clearTimeout(searchTimer);
  if (player) player.destroy();
});

// Global functions for onclick handlers
window.playAudio = playAudio;
window.playNext = playNext;
window.playPrevious = playPrevious;
window.hideNotification = hideNotification;
window.togglePlayback = togglePlayback;