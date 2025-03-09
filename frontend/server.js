const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Send all requests to index.html so the SPA can handle routing
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
});
