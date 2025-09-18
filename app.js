// Modified version for local testing - with fallback data
'use strict';

// Check if we can make API calls
const isLocalFile = window.location.protocol === 'file:';
const canUseAPI = !isLocalFile;

// Global state
let player = null;
let songQueue = [];
let currentIndex = -1;
let apiReady = false;
let isLoading = false;
let isPlaying = false;
let currentVideoId = null;

// API Configuration
const API_KEY = "AIzaSyCHd0jZWIldZtpl0UzbJUs4dcPO2ZmA-Ho";
const MAX_RESULTS = 12;

// Sample data for local testing (when API isn't available)
const SAMPLE_SONGS = [
  {
    id: { videoId: "dQw4w9WgXcQ" },
    snippet: {
      title: "Rick Astley - Never Gonna Give You Up",
      thumbnails: { medium: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg" } }
    }
  },
  {
    id: { videoId: "9bZkp7q19f0" },
    snippet: {
      title: "PSY - GANGNAM STYLE",
      thumbnails: { medium: { url: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg" } }
    }
  },
  {
    id: { videoId: "kJQP7kiw5Fk" },
    snippet: {
      title: "Luis Fonsi - Despacito ft. Daddy Yankee",
      thumbnails: { medium: { url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg" } }
    }
  },
  {
    id: { videoId: "JGwWNGJdvx8" },
    snippet: {
      title: "Ed Sheeran - Shape of You",
      thumbnails: { medium: { url: "https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg" } }
    }
  }
];

// Show notification about local mode
function showLocalModeNotification() {
  const notification = document.createElement('div');
  notification.className = 'local-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">⚠️</div>
      <div class="notification-text">
        <strong>Local Mode Detected</strong>
        <p>Using sample songs. For full functionality, use a local server.</p>
        <button onclick="this.parentElement.parentElement.parentElement.remove()">Got it</button>
      </div>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed; top: 10px; left: 10px; right: 10px; z-index: 1000;
    background: #ff9800; color: #000; padding: 15px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 14px;
  `;
  
  notification.querySelector('.notification-content').style.cssText = `
    display: flex; align-items: center; gap: 12px;
  `;
  
  notification.querySelector('button').style.cssText = `
    background: #000; color: #fff; border: none; padding: 5px 10px;
    border-radius: 4px; cursor: pointer; margin-left: 10px;
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
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
        <strong>Audio-Only Mode Active</strong>
        <p>Music will play in background without video</p>
      </div>
      <button class="notification-close" onclick="hideNotification()">×</button>
    </div>
  `;
  document.body.appendChild(notification);
}

// Show/hide notifications
function showAudioNotification() {
  const notification = document.getElementById('background-notification');
  if (notification) {
    notification.classList.remove('hidden');
    setTimeout(() => hideNotification(), 4000);
  }
}

function hideNotification() {
  const notification = document.getElementById('background-notification');
  if (notification) {
    notification.classList.add('hidden');
  }
}

// YouTube API Ready
function onYouTubeIframeAPIReady() {
  apiReady = true;
  try {
    player = new YT.Player('yt-player', {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        playsinline: 1,
        start: 0,
        enablejsapi: 1,
        origin: window.location.origin,
        vq: 'tiny',
        hd: 0
      },
      events: {
        onStateChange: handlePlayerStateChange,
        onReady: () => {
          console.log('Audio player ready');
          if (player.setPlaybackQuality) {
            player.setPlaybackQuality('small');
          }
          createNotificationElement();
          hideVideoPlayer();
          
          // Show local mode notification if needed
          if (isLocalFile) {
            showLocalModeNotification();
          }
          
          // Load sample songs if in local mode
          if (isLocalFile) {
            renderResults(SAMPLE_SONGS);
            if (SAMPLE_SONGS.length > 0) {
              setCurrentSong(SAMPLE_SONGS[0]);
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('YouTube player error:', error);
  }
}

// Hide video player
function hideVideoPlayer() {
  const playerFrame = document.querySelector('.player-frame');
  const iframeWrap = document.querySelector('.iframe-wrap');
  
  if (playerFrame) {
    playerFrame.style.display = 'none';
  }
  
  if (iframeWrap) {
    iframeWrap.style.position = 'absolute';
    iframeWrap.style.left = '-9999px';
    iframeWrap.style.width = '1px';
    iframeWrap.style.height = '1px';
    iframeWrap.style.opacity = '0';
    iframeWrap.style.pointerEvents = 'none';
  }
}

// Player state change handler
function handlePlayerStateChange(event) {
  const state = event.data;
  
  switch (state) {
    case YT.PlayerState.PLAYING:
      console.log('Audio playback started');
      isPlaying = true;
      updatePlayButton(true);
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
  }
}

// Update play button
function updatePlayButton(playing) {
  const playButtons = document.querySelectorAll('.play-btn');
  playButtons.forEach(btn => {
    const svg = btn.querySelector('svg');
    if (svg) {
      if (playing) {
        svg.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>';
      } else {
        svg.innerHTML = '<polygon points="5,3 19,12 5,21" fill="currentColor"/>';
      }
    }
  });
}

// DOM element caching
const elements = {};
function getElement(id) {
  if (!elements[id]) {
    elements[id] = document.getElementById(id);
  }
  return elements[id];
}

// Search handler
let searchTimer = null;
function handleSearch(query = null) {
  const searchInput = getElement('search');
  const searchQuery = query || searchInput.value.trim();
  
  if (!searchQuery || isLoading) return;
  
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  
  showLoading();
  
  searchTimer = setTimeout(() => {
    if (canUseAPI) {
      loadSongs(searchQuery);
    } else {
      // Filter sample songs for local mode
      const filtered = SAMPLE_SONGS.filter(song => 
        song.snippet.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      renderResults(filtered.length > 0 ? filtered : SAMPLE_SONGS);
    }
  }, 200);
}

// Load songs from API or use samples
async function loadSongs(query) {
  if (isLoading) return;
  isLoading = true;
  
  if (!canUseAPI) {
    // Use sample data for local testing
    setTimeout(() => {
      renderResults(SAMPLE_SONGS);
      isLoading = false;
    }, 500);
    return;
  }
  
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const items = data.items || [];
    
    requestAnimationFrame(() => {
      renderResults(items);
      if (items.length > 0) {
        setCurrentSong(items[0]);
      }
    });
    
  } catch (error) {
    console.error('Load error:', error);
    showError();
    // Fallback to sample songs
    renderResults(SAMPLE_SONGS);
  } finally {
    isLoading = false;
  }
}

// Render results
function renderResults(items) {
  const container = getElement('results');
  
  if (!items.length) {
    container.innerHTML = '<div class="loading">No results found</div>';
    return;
  }
  
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
  songQueue = items;
}

// Play audio
function playAudio(videoId, title, thumbnail, index = -1) {
  if (!apiReady || !player) return;
  
  try {
    console.log('Playing audio:', title);
    updateNowPlaying(title, thumbnail);
    currentVideoId = videoId;
    
    player.loadVideoById({
      videoId: videoId,
      suggestedQuality: 'small'
    });
    
    if (index >= 0) {
      currentIndex = index;
    } else {
      currentIndex = songQueue.findIndex(item => item.id.videoId === videoId);
    }
    
    if (currentIndex === 0 || !document.querySelector('.notification.hidden')) {
      showAudioNotification();
    }
    
    setTimeout(() => {
      if (songQueue.length > 0) {
        renderResults(songQueue);
      }
    }, 500);
    
  } catch (error) {
    console.error('Audio play error:', error);
  }
}

// Toggle playback
function togglePlayback() {
  if (!player || !apiReady) return;
  
  const state = player.getPlayerState();
  
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED) {
    player.playVideo();
  }
}

// Update UI
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

// Navigation
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

// UI states
function showLoading() {
  const container = getElement('results');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading songs...</span></div>';
}

function showError() {
  const container = getElement('results');
  container.innerHTML = '<div class="loading">Failed to load. Please try again.</div>';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Tab switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  const targetTab = getElement(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
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
    
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (query.length > 2) {
        handleSearch(query);
      }
    });
  }
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
  
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
  
  // Don't auto-load if in local mode - wait for user interaction
  if (!isLocalFile) {
    const randomQuery = ['trending music', 'top hits', 'popular songs'][Math.floor(Math.random() * 3)];
    setTimeout(() => loadSongs(randomQuery), 100);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
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

// Cleanup
window.addEventListener('beforeunload', () => {
  if (searchTimer) clearTimeout(searchTimer);
  if (player) player.destroy();
});

// Global functions
window.playAudio = playAudio;
window.playNext = playNext;
window.playPrevious = playPrevious;
window.hideNotification = hideNotification;
window.togglePlayback = togglePlayback;