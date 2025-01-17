const userModel = require('../models/user.model.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blacklisttokenModel = require('../models/blacklisttoken.model.js');
const { subscribe } = require('../routes/user.routes.js');
const { subscribeToQueue } = require('../../ride/service/rabbit.js');

module.exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        const newUser = new userModel({ name, email, password: hash});

        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        delete newUser._doc.password;

        res.cookie('token', token);

        res.send({token,newUser});
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        delete user._doc.password;

        res.cookie('token', token);

        res.send({token,user});

    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

module.exports.logout = async (req, res) => {
    try {
        const token = req.cookies.token;
        await blacklisttokenModel.create({ token });
        res.clearCookie('token');
        res.send({ message: 'User logged out successfully' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

module.exports.profile = async (req, res) => {
    try {
        res.send(req.user);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

module.exports.acceptedRide = async (req, res) => {

    rideEventEmitter.once('ride-accepted', (data) => {
        res.send(data);
    });

    setTimeout(() => {
        res.status(204).send();
    }, 30000);  
}

subscribeToQueue('ride-accepted', async (msg) => {
    const data = JSON.parse(msg.content.toString());
    rideEventEmitter.emit('ride-accepted', data);
});
