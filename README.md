# yt_dld

A simple Node.js CLI tool for downloading YouTube videos and audio using [yt-dlp](https://github.com/yt-dlp/yt-dlp) via the [yt-dlp-exec](https://www.npmjs.com/package/yt-dlp-exec) npm package. No system installation of yt-dlp required!

## Features
- Download YouTube videos in MP4 format
- Download audio as MP3
- Specify quality (best, worst, or a specific resolution/bitrate)
- No need for Python or system-wide yt-dlp install

## Prerequisites
- [Node.js](https://nodejs.org/) (v14 or newer recommended)

## Installation
1. Clone or download this repository.
2. Install dependencies:
   ```sh
   npm install
   ```

## Usage

### Download a YouTube video (best quality, MP4)
```sh
node yt_dld.js <YouTube_URL> --format=mp4
```

### Download audio as MP3
```sh
node yt_dld.js <YouTube_URL> --format=mp3
```

### Download with specific quality
- For video (e.g., 720p):
  ```sh
  node yt_dld.js <YouTube_URL> --format=mp4 --quality=720
  ```
- For audio (e.g., 128k):
  ```sh
  node yt_dld.js <YouTube_URL> --format=mp3 --quality=128k
  ```

### Arguments
- `<YouTube_URL>`: The URL of the YouTube video to download (required)
- `--format=mp4|mp3`: Output format (default: mp4)
- `--quality=best|worst|<height>|<abr>`: Quality (default: best)
  - For video: use a number for resolution (e.g., 720)
  - For audio: use a bitrate (e.g., 128k)

## Output
- The downloaded file will be saved in the current directory, named after the video title.

## Example
```sh
node yt_dld.js https://youtu.be/dQw4w9WgXcQ --format=mp4
node yt_dld.js https://youtu.be/dQw4w9WgXcQ --format=mp3
```

## License
MIT 