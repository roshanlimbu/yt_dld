const express = require("express");
const cors = require("cors");
const youtubedl = require("yt-dlp-exec");
dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.post("/download", (req, res) => {
  const { url, format = "mp4", quality = "best" } = req.body;

  if (!url) return res.status(400).json({ error: "YouTube URL is required" });

  let ytdlpOptions = { output: "%(title)s.%(ext)s" };

  if (format == "mp3") {
    ytdlpOptions.extractAudio = true;
    ytdlpOptions.audioFormat = "mp3";
    if (quality !== "best") ytdlpOptions.audioQuality = quality;
  } else if (format == "mp4") {
    ytdlpOptions.format =
      "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
  } else {
    ytdlpOptions.format =
      quality == "best"
        ? "bestvideo+bestaudio/best"
        : `bestvideo[ext=${format}][height<=${quality}]+bestaudio/best[ext=${format}][height<=${quality}]`;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const subprocess = youtubedl.exec(url, ytdlpOptions);

  subprocess.stdout.on("data", (data) => {
    const line = data.toString();
    const match = line.match(/(\d+(?:\.\d+)?)%/);
    if (match) {
      // Send progress as SSE event
      res.write(`event: progress\n`);
      res.write(`data: ${match[1]}\n\n`);
    }
  });

  subprocess.stderr.on("data", (data) => {
    const line = data.toString();
    const match = line.match(/(\d+(?:\.\d+)?)%/);
    if (match) {
      res.write(`event: progress\n`);
      res.write(`data: ${match[1]}\n\n`);
    }
  });

  subprocess.on("close", (code) => {
    res.write(`event: done\n`);
    res.write(`data: ${code}\n\n`);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
