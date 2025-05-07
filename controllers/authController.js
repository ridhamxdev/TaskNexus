const Joi = require('joi');

const authValidationSchema = {
  register: Joi.object({
    name: Joi.string().required().min(2).max(50)
      .messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    email: Joi.string().email().required().trim()
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is required'
      }),
    password: Joi.string().required().min(6).max(100)
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 100 characters'
      }),
    phone: Joi.string().required()
      .messages({
        'string.empty': 'Phone number is required'
      }),
    address: Joi.string().required()
      .messages({
        'string.empty': 'Address is required'
      }),
    dob: Joi.date().required()
      .messages({
        'date.base': 'Please provide a valid date',
        'any.required': 'Date of birth is required'
      })
  }),
  
  login: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is required'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'Password is required'
      })
  })
};

// Registration endpoint
const registerUser = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = authValidationSchema.register.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.context.key,
          message: detail.message
        }))
      });
    }

    // Proceed with user creation using validated data
    const user = await User.create(value);
    
    // Generate token for the new user
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: err.message
    });
  }
};