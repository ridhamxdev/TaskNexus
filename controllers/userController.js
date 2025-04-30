const User = require('../models/User');

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, dob } = req.body;
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }
    const user = await User.create({
      'name':req.body.name,
      'email':req.body.email,
      'password':req.body.password,
      'phone':req.body.phone,
      'address':req.body.address,
      dob: new Date(dob)
    });

    const token = user.generateAuthToken();
    res.status(201).json({'message':"User registered"});
  } catch (err) {
    console.error(err);
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({'message': 'Please provide email and password'});
    }
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }
    const token = user.generateAuthToken();
      res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token
      }
    });
    }catch (error) {
    console.error(error);
  }
};
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        dob: user.dob
      }
    });
  } catch (error) {
    console.error(error);
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, email, phone, address, dob } = req.body;
    const user = await User.findById(req.user._id);

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          'message': 'Email already in use'
        });
      }
    }

    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({
          'message': 'Phone number already in use'
        });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (dob) user.dob = new Date(dob);

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        dob: updatedUser.dob
      }
    });
  } catch (error) {
   console.error(error);
  }
};
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndRemove(req.user._id);

    res.status(200).json({
      'message': 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
};
}
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  getAllUsers
}