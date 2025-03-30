class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isShuffled = false;
        this.repeatMode = 'none'; // none, one, all
        this.isDragging = false;

        this.initializeElements();
        this.setupEventListeners();
        this.loadMusicFromFolder();
    }

    initializeElements() {
        this.titleElement = document.getElementById('title');
        this.artistElement = document.getElementById('artist');
        this.albumArt = document.querySelector('.album-art');
        this.playBtn = document.getElementById('play');
        this.prevBtn = document.getElementById('prev');
        this.nextBtn = document.getElementById('next');
        this.shuffleBtn = document.getElementById('shuffle');
        this.repeatBtn = document.getElementById('repeat');
        this.progressBar = document.querySelector('.progress');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.durationSpan = document.getElementById('duration');
        this.volumeSlider = document.getElementById('volume');
        this.playlistContainer = document.getElementById('playlist');
    }

    // Add this to your setupEventListeners method
    setupEventListeners() {
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.volumeSlider.addEventListener('input', () => this.updateVolume());
        
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        
        const progressContainer = document.querySelector('.progress-container');
        progressContainer.addEventListener('click', (e) => this.handleProgressClick(e));
        progressContainer.addEventListener('mousedown', () => {
            this.isDragging = true;
            document.addEventListener('mousemove', this.handleProgressDrag.bind(this));
            document.addEventListener('mouseup', () => {
                this.isDragging = false;
                document.removeEventListener('mousemove', this.handleProgressDrag.bind(this));
            });
        });
    }

    // Add these new methods to your MusicPlayer class
    handleProgressClick(e) {
        const progressContainer = document.querySelector('.progress-container');
        const rect = progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
    }

    handleProgressDrag(e) {
        if (this.isDragging) {
            const progressContainer = document.querySelector('.progress-container');
            const rect = progressContainer.getBoundingClientRect();
            let percent = (e.clientX - rect.left) / rect.width;
            // Clamp the value between 0 and 1
            percent = Math.max(0, Math.min(1, percent));
            this.audio.currentTime = percent * this.audio.duration;
        }
    }

    async loadMusicFromFolder() {
        try {
            // Use relative path instead of localhost
            const response = await fetch('./music/music-data.json');
            const musicData = await response.json();
            
            this.playlist = musicData;
            this.renderPlaylist();
            
            if (this.playlist.length > 0) {
                this.currentTrackIndex = 0;
                this.loadSong(this.playlist[0]);
            }
        } catch (error) {
            console.error('Error loading music:', error);
        }
    }

    loadSong(song) {
        if (!song) return;
        
        // Use relative path
        this.audio.src = `./music/${song.filename}`;
        this.updatePlayerInfo(song);
        this.renderPlaylist();

        if (this.titleElement) this.titleElement.textContent = song.title;
        if (this.artistElement) this.artistElement.textContent = song.artist;
        if (this.albumArt) {
            this.albumArt.src = song.cover || '';
            this.albumArt.onerror = () => {
                this.albumArt.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
        }
        
        this.renderPlaylist();
    }

    updateProgress() {
        if (this.audio.duration) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            this.progress.style.width = `${progress}%`;
            this.currentTimeSpan.textContent = this.formatTime(this.audio.currentTime);
            this.durationSpan.textContent = this.formatTime(this.audio.duration);
        }
    }

    renderPlaylist() {
        this.playlistContainer.innerHTML = '';
        this.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === this.currentTrackIndex ? 'active' : ''}`;
            item.innerHTML = `
                <img src="${track.cover}" alt="${track.title}">
                <div class="playlist-item-info">
                    <h3>${track.title}</h3>
                    <p>${track.artist}</p>
                </div>
            `;
            item.addEventListener('click', () => this.playTrack(index));
            this.playlistContainer.appendChild(item);
        });
    }

    playTrack(index) {
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        if (!track) return;
        
        // Use relative path
        this.audio.src = `./music/${track.filename}`;
        this.audio.play();
        this.isPlaying = true;
        this.updatePlayerInfo(track);
        this.updatePlayButton();
        this.renderPlaylist();
    }

    togglePlay() {
        if (this.audio.src) {
            if (this.isPlaying) {
                this.audio.pause();
            } else {
                this.audio.play();
            }
            this.isPlaying = !this.isPlaying;
            this.updatePlayButton();
        }
    }

    updatePlayButton() {
        this.playBtn.innerHTML = this.isPlaying ? 
            '<i class="fas fa-pause"></i>' : 
            '<i class="fas fa-play"></i>';
    }

    updatePlayerInfo(song) {
        if (!song) return;
        
        if (this.titleElement) {
            this.titleElement.textContent = song.title || '';
        }
        if (this.artistElement) {
            this.artistElement.textContent = song.artist || '';
        }
        if (this.albumArt) {
            this.albumArt.src = song.cover || '';
            this.albumArt.onerror = () => {
                this.albumArt.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
        }
    }

    updateProgress() {
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.currentTimeSpan.textContent = this.formatTime(this.audio.currentTime);
        this.durationSpan.textContent = this.formatTime(this.audio.duration);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateVolume() {
        const volume = this.volumeSlider.value / 100;
        this.audio.volume = volume;
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('active');
        
        if (this.isShuffled) {
            // Create a shuffled copy of the playlist
            this.shuffledIndices = [...Array(this.playlist.length).keys()];
            for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.shuffledIndices[i], this.shuffledIndices[j]] = 
                [this.shuffledIndices[j], this.shuffledIndices[i]];
            }
            
            // Find current track's new position in shuffled playlist
            this.currentShuffleIndex = this.shuffledIndices.indexOf(this.currentTrackIndex);
        }
    }

    playNext() {
        if (this.playlist.length > 0) {
            if (this.isShuffled) {
                this.currentShuffleIndex = (this.currentShuffleIndex + 1) % this.playlist.length;
                this.currentTrackIndex = this.shuffledIndices[this.currentShuffleIndex];
            } else {
                this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
            }
            this.playTrack(this.currentTrackIndex);
        }
    }

    playPrevious() {
        if (this.playlist.length > 0) {
            if (this.isShuffled) {
                this.currentShuffleIndex = (this.currentShuffleIndex - 1 + this.playlist.length) % this.playlist.length;
                this.currentTrackIndex = this.shuffledIndices[this.currentShuffleIndex];
            } else {
                this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
            }
            this.playTrack(this.currentTrackIndex);
        }
    }

    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        this.updateRepeatButton();
    }

    updateRepeatButton() {
        this.repeatBtn.className = 'control-btn';
        if (this.repeatMode === 'one') {
            this.repeatBtn.classList.add('active');
            this.repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
        } else if (this.repeatMode === 'all') {
            this.repeatBtn.classList.add('active');
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        } else {
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        }
    }

    handleTrackEnd() {
        if (this.repeatMode === 'one') {
            this.audio.play();
        } else if (this.repeatMode === 'all' || this.playlist.length > 1) {
            this.playNext();
        }
    }
}

// Initialize the player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
});