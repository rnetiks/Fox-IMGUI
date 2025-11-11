const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/cache', (req, res) => {
    // Handle cache POST request
    res.json({message: 'Cache endpoint reached'});
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});