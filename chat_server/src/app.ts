import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
const cors = require('cors');
import { Bee } from '@ethersphere/bee-js';
const roomRoutes = require('./routes/room');
require('dotenv').config();

const app = express();
const bee = new Bee("http://localhost:1633");

// Middleware
app.use(bodyParser.json());
var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

// Routes
app.use('/room', cors(corsOptions), roomRoutes)

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});