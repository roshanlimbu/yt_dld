const express = require("express");
const cors = require("cors");
const youtubedl = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid"); // npm install uuid
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DOWNLOADS_DIR = path.join(__dirname, "downloads");

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR);
}

// Store active downloads
const activeDownloads = new Map();

app.post("/download", async (req, res) => {
  const { url, format = "mp4", quality = "best" } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  // Generate unique ID for this download
  const downloadId = uuidv4();
  
  // Initialize download tracking
  activeDownloads.set(downloadId, {
    progress: 0,
    done: false,
    file: null,
    error: null
  });

  // Return the ID immediately
  res.json({ id: downloadId });

  // Start download in background
  startDownload(downloadId, url, format, quality);
});

async function startDownload(downloadId, url, format, quality) {
  const downloadInfo = activeDownloads.get(downloadId);
  
  try {
    // Set up yt-dlp options
    const outputTemplate = path.join(DOWNLOADS_DIR, `${downloadId}_%(title)s.%(ext)s`);
    let ytdlpOptions = { output: outputTemplate };

    if (format === "mp3") {
      ytdlpOptions.extractAudio = true;
      ytdlpOptions.audioFormat = "mp3";
      if (quality !== "best") ytdlpOptions.audioQuality = quality;
    } else if (format === "mp4") {
      ytdlpOptions.format = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
    } else {
      ytdlpOptions.format = quality === "best"
        ? "bestvideo+bestaudio/best"
        : `bestvideo[ext=${format}][height<=${quality}]+bestaudio/best[ext=${format}][height<=${quality}]`;
    }

    const subprocess = youtubedl.exec(url, ytdlpOptions);

    // Handle progress from stdout
    subprocess.stdout.on("data", (data) => {
      const match = data.toString().match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        downloadInfo.progress = parseFloat(match[1]);
      }
    });

    // Handle progress from stderr  
    subprocess.stderr.on("data", (data) => {
      const match = data.toString().match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        downloadInfo.progress = parseFloat(match[1]);
      }
    });

    // Handle completion
    subprocess.on("close", (code) => {
      if (code === 0) {
        // Find the downloaded file
        const files = fs.readdirSync(DOWNLOADS_DIR);
        const downloadedFile = files.find(file => file.startsWith(downloadId));
        
        if (downloadedFile) {
          downloadInfo.done = true;
          downloadInfo.file = downloadedFile;
          downloadInfo.progress = 100;
        } else {
          downloadInfo.error = "Downloaded file not found";
        }
      } else {
        downloadInfo.error = `Download failed with code ${code}`;
      }
    });

  } catch (error) {
    downloadInfo.error = error.message;
  }
}

// SSE endpoint for progress tracking
app.get("/progress/:id", (req, res) => {
  const downloadId = req.params.id;
  
  if (!activeDownloads.has(downloadId)) {
    return res.status(404).json({ error: "Download not found" });
  }

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control"
  });

  // Send progress updates
  const interval = setInterval(() => {
    const downloadInfo = activeDownloads.get(downloadId);
    
    if (!downloadInfo) {
      clearInterval(interval);
      res.end();
      return;
    }

    // Send progress update
    res.write(`data: ${JSON.stringify({
      progress: Math.round(downloadInfo.progress),
      done: downloadInfo.done,
      file: downloadInfo.file,
      error: downloadInfo.error
    })}\n\n`);

    // Clean up if done or error
    if (downloadInfo.done || downloadInfo.error) {
      clearInterval(interval);
      // Keep the download info for a bit longer for the file download
      setTimeout(() => {
        activeDownloads.delete(downloadId);
      }, 300000); // 5 minutes
      res.end();
    }
  }, 1000); // Update every second

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(interval);
  });
});

// Serve downloaded files
app.use("/files", express.static(DOWNLOADS_DIR));

// Clean up old files periodically (optional)
setInterval(() => {
  const files = fs.readdirSync(DOWNLOADS_DIR);
  const now = Date.now();
  
  files.forEach(file => {
    const filePath = path.join(DOWNLOADS_DIR, file);
    const stats = fs.statSync(filePath);
    const fileAge = now - stats.mtime.getTime();
    
    // Delete files older than 1 hour
    if (fileAge > 3600000) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up old file: ${file}`);
    }
  });
}, 600000); // Check every 10 minutes

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});