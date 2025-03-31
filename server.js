const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const mm = require('music-metadata');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.static(__dirname));
app.use('/covers', express.static(path.join(__dirname, 'covers')));
app.use('/music', express.static(path.join(__dirname, 'music')));

// Modify this part of your server.js file
app.get('/get-music', async (req, res) => {
    const musicDir = path.join(__dirname, 'music');
    const coversDir = path.join(__dirname, 'covers');
    
    try {
        if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir);
        if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir);

        const files = await fs.promises.readdir(musicDir);
        const coverFiles = await fs.promises.readdir(coversDir);
        console.log('Found cover files:', coverFiles);

        const musicFiles = files.filter(file => file.endsWith('.mp3'));
        
        // Add this near the top of your file, after const app = express();
        const BASE_URL = 'http://localhost:3000';
        
        // In your /get-music endpoint, modify the cover path to include the full URL
        const musicData = await Promise.all(musicFiles.map(async (filename) => {
            const filePath = path.join(musicDir, filename);
            try {
                const metadata = await mm.parseFile(filePath);
                const albumName = metadata.common.album || 'Unknown Album';
                
                // Log the metadata for debugging
                console.log('Song metadata:', {
                    filename,
                    album: albumName,
                    artist: metadata.common.artist
                });

                // Find matching cover file
                const coverFile = coverFiles.find(cover => {
                    // Remove special characters and convert to lowercase
                    const normalizedCover = cover.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normalizedAlbum = albumName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    // Check if the normalized names match
                    const isMatch = normalizedCover.includes(normalizedAlbum) || 
                                  normalizedAlbum.includes(normalizedCover);
                    
                    if (isMatch) {
                        console.log(`Match found: "${cover}" for album "${albumName}"`);
                    }
                    
                    return isMatch;
                });

                // Check if the cover file exists
                if (coverFile) {
                    const coverPath = path.join(coversDir, coverFile);
                    const exists = fs.existsSync(coverPath);
                    console.log(`Cover file ${coverPath} exists: ${exists}`);
                }

                return {
                    filename,
                    title: metadata.common.title || filename.replace('.mp3', ''),
                    artist: metadata.common.artist || 'Unknown Artist',
                    album: albumName,
                    // Use relative path instead of absolute URL
                    cover: coverFile ? `/covers/${encodeURIComponent(coverFile)}` : null
                };
            } catch (err) {
                console.error(`Error processing ${filename}:`, err);
                return {
                    filename,
                    title: filename.replace('.mp3', ''),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    cover: null
                };
            }
        }));

        console.log('Sending music data:', musicData);
        res.json(musicData);
    } catch (error) {
        console.error('Error reading music directory:', error);
        res.status(500).json({ error: 'Failed to read music directory' });
    }
});

// Function to find and kill process using the port
function killProcessOnPort(port) {
    return new Promise((resolve, reject) => {
        exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
            if (error || !stdout) {
                reject(`No process found using port ${port}`);
                return;
            }

            // Get PID from the output
            const lines = stdout.split('\n');
            const line = lines.find(l => l.includes('LISTENING'));
            if (!line) {
                reject('No listening process found');
                return;
            }

            const pid = line.trim().split(/\s+/).pop();
            exec(`taskkill /F /PID ${pid}`, (error, stdout, stderr) => {
                if (error) {
                    reject(`Failed to kill process: ${error}`);
                    return;
                }
                resolve();
            });
        });
    });
}

// Start server with retry logic
function startServer() {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    }).on('error', async (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${PORT} is busy, attempting to free it...`);
            try {
                await killProcessOnPort(PORT);
                console.log('Successfully killed previous process');
                setTimeout(startServer, 1000); // Retry after 1 second
            } catch (error) {
                console.error('Failed to free port:', error);
                process.exit(1);
            }
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

// Add this new function to generate static JSON
async function generateMusicData() {
    const musicDir = path.join(__dirname, 'music');
    const coversDir = path.join(__dirname, 'covers');
    const musicDataPath = path.join(musicDir, 'music-data.json');
    
    try {
        if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir);
        if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir);

        const files = await fs.promises.readdir(musicDir);
        const coverFiles = await fs.promises.readdir(coversDir);
        const musicFiles = files.filter(file => file.endsWith('.mp3'));
        
        const musicData = await Promise.all(musicFiles.map(async (filename) => {
            const filePath = path.join(musicDir, filename);
            try {
                const metadata = await mm.parseFile(filePath);
                const albumName = metadata.common.album || 'Unknown Album';
                
                // Log the metadata for debugging
                console.log('Song metadata:', {
                    filename,
                    album: albumName,
                    artist: metadata.common.artist
                });

                // Find matching cover file
                const coverFile = coverFiles.find(cover => {
                    // Remove special characters and convert to lowercase
                    const normalizedCover = cover.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normalizedAlbum = albumName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    // Check if the normalized names match
                    const isMatch = normalizedCover.includes(normalizedAlbum) || 
                                  normalizedAlbum.includes(normalizedCover);
                    
                    if (isMatch) {
                        console.log(`Match found: "${cover}" for album "${albumName}"`);
                    }
                    
                    return isMatch;
                });

                // Check if the cover file exists
                if (coverFile) {
                    const coverPath = path.join(coversDir, coverFile);
                    const exists = fs.existsSync(coverPath);
                    console.log(`Cover file ${coverPath} exists: ${exists}`);
                }

                return {
                    filename,
                    title: metadata.common.title || filename.replace('.mp3', ''),
                    artist: metadata.common.artist || 'Unknown Artist',
                    album: albumName,
                    cover: coverFile ? `/covers/${coverFile}` : null
                };
            } catch (err) {
                console.error(`Error processing ${filename}:`, err);
                return {
                    filename,
                    title: filename.replace('.mp3', ''),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    cover: null
                };
            }
        }));

        // Write the music data to a JSON file
        await fs.promises.writeFile(
            musicDataPath,
            JSON.stringify(musicData, null, 2)
        );
        
        console.log('Generated music-data.json');
    } catch (error) {
        console.error('Error generating music data:', error);
    }
}

// Call this function when starting the server
generateMusicData();

const PORT = 3000;

// Function to find and kill process using the port
function killProcessOnPort(port) {
    return new Promise((resolve, reject) => {
        exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
            if (error || !stdout) {
                reject(`No process found using port ${port}`);
                return;
            }

            // Get PID from the output
            const lines = stdout.split('\n');
            const line = lines.find(l => l.includes('LISTENING'));
            if (!line) {
                reject('No listening process found');
                return;
            }

            const pid = line.trim().split(/\s+/).pop();
            exec(`taskkill /F /PID ${pid}`, (error, stdout, stderr) => {
                if (error) {
                    reject(`Failed to kill process: ${error}`);
                    return;
                }
                resolve();
            });
        });
    });
}

// Start server with retry logic
function startServer() {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    }).on('error', async (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${PORT} is busy, attempting to free it...`);
            try {
                await killProcessOnPort(PORT);
                console.log('Successfully killed previous process');
                setTimeout(startServer, 1000); // Retry after 1 second
            } catch (error) {
                console.error('Failed to free port:', error);
                process.exit(1);
            }
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

startServer();