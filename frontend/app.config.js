const os = require("os");
const appJson = require("./app.json");

/** Mac/PC LAN IPv4 — injected when Metro starts (restart npm start after Wi‑Fi change). */
function getLanIPv4() {
  try {
    const nets = os.networkInterfaces();
    for (const name of ["en0", "en1", "wlan0", "eth0", "Wi-Fi"]) {
      const list = nets[name];
      if (!list) continue;
      for (const net of list) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
    for (const list of Object.values(nets)) {
      for (const net of list || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {
    /* sandbox / restricted env */
  }
  return "127.0.0.1";
}

const devApiHost = getLanIPv4();

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      devApiHost,
      devApiUrl: `http://${devApiHost}:8000`,
    },
  },
};
