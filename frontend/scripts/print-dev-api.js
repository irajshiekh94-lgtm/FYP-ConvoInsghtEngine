#!/usr/bin/env node
const os = require("os");

function getLanIPv4() {
  try {
    const nets = os.networkInterfaces();
    for (const name of ["en0", "en1", "wlan0", "eth0"]) {
      const list = nets[name];
      if (!list) continue;
      for (const net of list) {
        if (net.family === "IPv4" && !net.internal) return net.address;
      }
    }
    for (const list of Object.values(nets)) {
      for (const net of list || []) {
        if (net.family === "IPv4" && !net.internal) return net.address;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

const ip = getLanIPv4();
if (ip) {
  console.log("");
  console.log("📡 ConvoInsight dev API (auto-injected into app):");
  console.log(`   http://${ip}:8000`);
  console.log("   Backend: uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload");
  console.log("   Change Wi‑Fi? Stop and run npm start again.");
  console.log("");
} else {
  console.warn("Could not detect LAN IP — use Simulator or set EXPO_PUBLIC_API_URL");
}
