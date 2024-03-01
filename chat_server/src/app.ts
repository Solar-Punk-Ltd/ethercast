import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { Bee } from '@ethersphere/bee-js';
const roomRoutes = require('./routes/room');
require('dotenv').config();

const app = express();
const bee = new Bee("http://localhost:1633");

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/room', roomRoutes)

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});