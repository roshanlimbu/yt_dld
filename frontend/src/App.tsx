import React, { useState } from "react";

type DownloadRequest = {
  url: string;
  format: "mp4" | "mp3";
  quality?: string;
};

const backendUrl = "http://localhost:3000"; // change if needed

export default function App() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");
  const [quality, setQuality] = useState("best");
  const [progress, setProgress] = useState(0);
  const [downloadLink, setDownloadLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const handleDownload = async () => {
    if (!url) {
      setError("Please enter a YouTube URL");
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setProgress(0);
    setDownloadLink("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${backendUrl}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format, quality } as DownloadRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start download");
      }

      // Get an ID for progress tracking
      const { id } = await response.json();

      // SSE for progress updates
      const eventSource = new EventSource(`${backendUrl}/progress/${id}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            setError(data.error);
            eventSource.close();
            setLoading(false);
            return;
          }

          if (data.progress !== undefined) {
            setProgress(data.progress);
          }

          if (data.done && data.file) {
            setDownloadLink(`${backendUrl}/files/${data.file}`);
            eventSource.close();
            setLoading(false);
          }
        } catch (parseError) {
          console.error("Error parsing SSE data:", parseError);
        }
      };

      eventSource.onerror = (event) => {
        console.error("SSE error:", event);
        eventSource.close();
        setLoading(false);
        setError("Connection error. Please try again.");
      };

      // Timeout after 10 minutes
      setTimeout(() => {
        if (loading) {
          eventSource.close();
          setLoading(false);
          setError("Download timeout. Please try again.");
        }
      }, 600000);

    } catch (error) {
      console.error(error);
      setLoading(false);
      setError(error instanceof Error ? error.message : "Download failed. Check backend connection.");
    }
  };

  const resetForm = () => {
    setUrl("");
    setProgress(0);
    setDownloadLink("");
    setError("");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="bg-white shadow-2xl rounded-3xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎵 YouTube Downloader
          </h1>
          <p className="text-gray-600">Download videos and audio from YouTube</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* URL input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL
          </label>
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Format & Quality */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={format}
              onChange={(e) => setFormat(e.target.value as "mp4" | "mp3")}
              disabled={loading}
            >
              <option value="mp4">MP4 (Video)</option>
              <option value="mp3">MP3 (Audio)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={loading}
            >
              <option value="best">Best</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Downloading...
            </div>
          ) : (
            "Start Download"
          )}
        </button>

        {/* Progress Bar */}
        {loading && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Download Link */}
        {downloadLink && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="text-center">
              <div className="text-green-600 font-semibold mb-3 flex items-center justify-center">
                <span className="text-2xl mr-2">✅</span>
                Download Complete!
              </div>
              <div className="space-y-3">
                <a
                  href={downloadLink}
                  className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all font-semibold"
                  download
                >
                  📥 Download File
                </a>
                <br />
                <button
                  onClick={resetForm}
                  className="text-gray-600 hover:text-gray-800 text-sm underline"
                >
                  Download Another Video
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}