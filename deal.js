import http from "http";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import express from "express";

// Icecast 2 configuration
const ICECAST_HOST = process.env.ICECAST_HOST || "your-icecast-server.com";
const ICECAST_PORT = process.env.ICECAST_PORT || 8000;
const ICECAST_USER = process.env.ICECAST_USER || "source";
const ICECAST_PASSWORD = process.env.ICECAST_PASSWORD || "hackme";
const ICECAST_MOUNT = process.env.ICECAST_MOUNT || "/stream.mp3";

const app = express();
const PORT = process.env.PORT || 3000;

function restreamYoutube(url) {
  console.log("Fetching YouTube audio:", url);

  const ytStream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });

  const auth = Buffer.from(`${ICECAST_USER}:${ICECAST_PASSWORD}`).toString("base64");
  const options = {
    host: ICECAST_HOST,
    port: ICECAST_PORT,
    path: ICECAST_MOUNT,
    method: "SOURCE",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "audio/mpeg",
      "Ice-Public": "1",
      "Ice-Name": "My Restream",
      "Ice-Genre": "Various",
    },
  };

  const req = http.request(options, (res) => {
    console.log("Icecast response status:", res.statusCode);
  });

  req.on("error", (err) => {
    console.error("Error connecting to Icecast:", err);
  });

  ffmpeg(ytStream)
    .format("mp3")
    .audioBitrate(128)
    .on("error", (err) => console.error("FFmpeg error:", err))
    .on("end", () => {
      console.log("YouTube stream ended.");
      req.end();
    })
    .pipe(req, { end: true });
}

// API endpoint to start streaming
app.get("/stream", (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send("Missing YouTube URL");
  }
  restreamYoutube(url);
  res.send("Streaming started to Icecast.");
});

// Health check endpoints
app.get("/", (req, res) => {
  res.send("✅ Icecast Restreamer is running.");
});

app.get("/status", (req, res) => {
  res.json({
    status: "running",
    icecastHost: ICECAST_HOST,
    icecastMount: ICECAST_MOUNT,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
