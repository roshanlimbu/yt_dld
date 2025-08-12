const youtubedl = require("yt-dlp-exec");
const cliProgress = require("cli-progress"); // npm install cli-progress

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
  ytdlpOptions.format =
    "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
} else {
  ytdlpOptions.format =
    quality === "best"
      ? "bestvideo+bestaudio/best"
      : `bestvideo[ext=${format}][height<=${quality}]+bestaudio/best[ext=${format}][height<=${quality}]`;
}

// progress bar
const progressBar = new cliProgress.SingleBar({
  format: "Downloading [{bar}] {percentage}% | ETA: {eta}s",
  barCompleteChar: "\u2588",
  barIncompleteChar: "\u2591",
  hideCursor: true,
});
progressBar.start(100, 0);

const subprocess = youtubedl.exec(url, ytdlpOptions);

subprocess.stdout.on("data", (data) => {
  const line = data.toString();
  const match = line.match(/(\d+(?:\.\d+)?)%/);
  if (match) {
    progressBar.update(parseFloat(match[1]));
  }
});

subprocess.stderr.on("data", (data) => {
  const line = data.toString();
  const match = line.match(/(\d+(?:\.\d+)?)%/);
  if (match) {
    progressBar.update(parseFloat(match[1]));
  }
});

subprocess.on("close", (code) => {
  progressBar.stop();
  if (code === 0) {
    console.log("Download complete!");
  } else {
    console.error(`yt-dlp exited with code ${code}`);
  }
});
