const mongoose = require('mongoose');

function connect() {
    mongoose.connect(process.env.MONGO_URL).then(() => {
        console.log('Connected to MongoDB');
    }).catch((err) => {
        console.log('Failed to connect to MongoDB', err);
    });
}

module.exports = connect;