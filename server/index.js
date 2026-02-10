require('dotenv').config();
const express = require('express');
const path = require('path');
const proxyRoutes = require('./proxy');

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON request bodies
app.use(express.json());

// API proxy routes
app.use('/api', proxyRoutes);

// In production, serve the built React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
