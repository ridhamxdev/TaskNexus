const { User } = require('../models');

// Get wallet balance
const getWalletBalance = async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from authenticated request

        const user = await User.findOne({
            where: { id: userId },
            attributes: ['id', 'name', 'email', 'balance']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                balance: user.balance,
                userId: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching wallet balance',
            error: error.message
        });
    }
};

module.exports = {
    getWalletBalance
};