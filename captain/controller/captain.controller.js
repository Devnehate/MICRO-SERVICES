const captainModel = require('../models/captain.model.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blacklisttokenModel = require('../models/blacklisttoken.model.js');
const { subscribeToQueue } = require('../service/rabbit.js')

// Storage for pending long polling responses
const pendingResponses = [];

module.exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const captain = await captainModel.findOne({ email });

        if (captain) {
            return res.status(400).json({ message: 'captain already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        const newcaptain = new captainModel({ name, email, password: hash });

        await newcaptain.save();

        const token = jwt.sign({ id: newcaptain._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        delete newcaptain._doc.password;

        res.cookie('token', token);

        res.send({ token, newcaptain });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const captain = await captainModel.findOne({ email }).select('+password');

        if (!captain) {
            return res.status(400).json({ message: 'captain not found' });
        }

        const isMatch = await bcrypt.compare(password, captain.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: captain._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        delete captain._doc.password;

        res.cookie('token', token);

        res.send({ token, captain });

    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

module.exports.logout = async (req, res) => {
    try {
        const token = req.cookies.token;
        await blacklisttokenModel.create({ token });
        res.clearCookie('token');
        res.send({ message: 'captain logged out successfully' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

module.exports.profile = async (req, res) => {
    try {
        res.send(req.captain);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

module.exports.toggleAvailability = async (req, res) => {
    try {
        const captain = await captainModel.findById(req.captain._id);
        captain.isAvailable = !captain.isAvailable;
        await captain.save();
        res.send(captain);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

// New method for long polling
module.exports.waitForNewRide = async (req, res) => {
    try {
        const captain = await captainModel.findById(req.captain._id);
        if (!captain) {
            return res.status(401).json({ message: 'captain not found' });
        }

        // Set timeout for long polling (e.g., 30 seconds)
        const timeout = setTimeout(() => {
            res.status(204).send();
            // Remove this response from pendingResponses
            const index = pendingResponses.indexOf(res);
            if (index > -1) {
                pendingResponses.splice(index, 1);
            }
        }, 30000);

        // Add response to pendingResponses
        pendingResponses.push(res);

        // Clear timeout if response is sent
        req.on('close', () => {
            clearTimeout(timeout);
            const index = pendingResponses.indexOf(res);
            if (index > -1) {
                pendingResponses.splice(index, 1);
            }
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

subscribeToQueue('new-ride', (data) => {
    const rideData = JSON.parse(data);
    // Notify all pending captains
    pendingResponses.forEach(res => {
        res.send({ ride: rideData });
    });
    // Clear the pending responses
    pendingResponses.length = 0;
});
