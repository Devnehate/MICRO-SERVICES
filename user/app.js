const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const userRoutes = require('./routes/user.routes.js');
const cookieParser = require('cookie-parser');
const connect = require('./db/db.js');
const rabbitMq = require('./service/rabbit.js')

connect();
rabbitMq.connect();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use('/',userRoutes)

module.exports = app;