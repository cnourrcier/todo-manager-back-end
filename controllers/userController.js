const User = require('../models/userModel');
const asyncErrorHandler = require('../utils/asyncErrorHandler');
const CustomError = require('../utils/CustomError');
const ApiFeatures = require('../utils/ApiFeatures');
const jwt = require('jsonwebtoken');

const signToken = (id) => {
    // create a jwt: pass the payload and secret string to the sign function.
    // header will be automatically created by the sign function.
    // The more properties passed in the payload, the more secure the token will be.
    return jwt.sign({ id: id }, process.env.SECRET_STR, {
        expiresIn: process.env.LOGIN_EXPIRES
    })
}

exports.getAllUsers = asyncErrorHandler(async (req, res, next) => {
    const features = new ApiFeatures(User.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    const users = await features.query;

    res.status(200).json({
        status: 'success',
        length: users.length,
        data: {
            users
        }
    });
});

exports.createUser = asyncErrorHandler(async (req, res, next) => {
    const newUser = await User.create(req.body);
    const token = signToken(newUser._id);
    res.status(201).json({
        status: 'success',
        token: token,
        data: {
            user: newUser
        }
    });
});

exports.loginUser = asyncErrorHandler(async (req, res, next) => {
    // Check if email & password are present in req body.
    const { email, password } = req.body;
    if (!email || !password) {
        const error = new CustomError('Please provide email ID and Password for login!', 400); // unauthorized
        return next(error);
    }
    // Check if user exists with given email.
    const user = await User.findOne({ email: email }).select('+password'); //select function to include password.
    // Check if user exists first, and if so then check if passwords match.
    if (!user || !(await user.comparePasswordInDb(password, user.password))) {
        const error = new CustomError('Incorrect email or password.', 400); // unauthorized
        return next(error);
    }
    const token = signToken(user._id);

    res.status(200).json({
        status: 'success',
        token: token
    })
});

exports.getUserById = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        const error = new CustomError('User with that ID is not found', 404);
        // next sends the error to the global error handling middleware (GEHM)
        // return so that the rest of the code below 'next(error)' does not run after calling the GEHM
        return next(error);
    }
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    })
});

exports.updateUser = asyncErrorHandler(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!updatedUser) {
        const error = new CustomError('User with that ID is not found', 404);
        return next(error);
    }
    res.status(200).json({
        status: 'success',
        data: {
            updatedUser
        }
    });
});

exports.deleteUser = async (req, res, next) => {
    // will return a deleted user object if successfully deleted. If ID is not found, will return null.
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
        const error = new CustomError('User with that ID is not found', 404);
        return next(error);
    }
    res.status(204).json({
        status: 'success',
        data: null
    });
}


