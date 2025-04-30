const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: String,
    required: [true, 'Email recipient is required'],
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  subject: {
    type: String,
    required: [true, 'Email subject is required']
  },
  body: {
    type: String,
    required: [true, 'Email body is required']
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'failed'],
    default: 'sent'
  }
});

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;