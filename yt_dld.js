const youtubedl = require("yt-dlp-exec");

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Usage: node yt_dld.js <YouTube_URL> [--format=mp4|mp3] [--quality=best|worst|height|abr]",
  );
  process.exit(1);
}

const url = args[0];
let format = "mp4";
let quality = "best";

args.slice(1).forEach((arg) => {
  if (arg.startsWith("--format=")) {
    format = arg.split("=")[1];
  } else if (arg.startsWith("--quality=")) {
    quality = arg.split("=")[1];
  }
});

// yt-dlp-exec options here
let ytdlpOptions = {
  output: "%(title)s.%(ext)s",
};

if (format === "mp3") {
  ytdlpOptions.extractAudio = true;
  ytdlpOptions.audioFormat = "mp3";
  if (quality !== "best") {
    ytdlpOptions.audioQuality = quality;
  }
} else if (format === "mp4") {
  // fallback options for mp4
  ytdlpOptions.format =
    "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
} else {
  ytdlpOptions.format =
    quality === "best"
      ? "bestvideo+bestaudio/best"
      : `bestvideo[ext=${format}][height<=${quality}]+bestaudio/best[ext=${format}][height<=${quality}]`;
}

youtubedl(url, ytdlpOptions)
  .then((output) => {
    console.log("Download complete!");
    if (output) console.log(output);
  })
  .catch((err) => {
    console.error("Error:", err.stderr || err.message || err);
  });
