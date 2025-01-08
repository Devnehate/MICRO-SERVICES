const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const connect = require('./db/db.js');
connect();
const cookieParser = require('cookie-parser');
const rideRoutes = require('./routes/ride.routes.js');
const rabbitMq = require('./service/rabbit.js')

rabbitMq.connect();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use('/', rideRoutes);


module.exports = app;