'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, let's check what the current column type is
      const tableInfo = await queryInterface.describeTable('fee_configurations');
      console.log('Current type column info:', tableInfo.type);
      
      // Since the type column is currently VARCHAR(255), we need to:
      // 1. First, update any existing 'transaction' values to 'send_money'
      await queryInterface.sequelize.query(`
        UPDATE fee_configurations 
        SET type = 'send_money' 
        WHERE type = 'transaction' OR type IS NULL OR type = '';
      `);
      
      // 2. Then change the column to ENUM
      await queryInterface.sequelize.query(`
        ALTER TABLE fee_configurations 
        MODIFY COLUMN type ENUM('send_money', 'add_money', 'subscription') NOT NULL DEFAULT 'send_money';
      `);
      
      console.log('✅ Successfully converted type column to ENUM with ADD_MONEY support');
    } catch (error) {
      console.error('❌ Error in migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Convert back to VARCHAR
      await queryInterface.sequelize.query(`
        ALTER TABLE fee_configurations 
        MODIFY COLUMN type VARCHAR(255) NOT NULL DEFAULT 'send_money';
      `);
      
      console.log('✅ Successfully reverted type column to VARCHAR');
    } catch (error) {
      console.error('❌ Error in rollback:', error.message);
      throw error;
    }
  }
}; 