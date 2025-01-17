const rideModel = require('../models/ride.model.js');
const { subscribeToQueue, publishToQueue } = require('../service/rabbit.js')

module.exports.createRide = async (req, res, next) => {
    try {
        const { pickup, destination } = req.body;
        const newRide = new rideModel({
            user: req.user._id,
            pickup,
            destination
        });
        await newRide.save();
        publishToQueue("new-ride", JSON.stringify(newRide));
        res.send(newRide);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports.acceptRide = async (req, res, next) => {
    const { rideId } = req.query;
    const ride = await rideModel.findById(rideId);
    if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
    }

    ride.status = 'accepted';
    await ride.save();
    publishToQueue("ride-accepted", JSON.stringify(ride))
    res.send(ride);
    
}