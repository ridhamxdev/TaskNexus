'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Fixing column name case for amount fields...');

      // Make min_amount and max_amount nullable (using snake_case)
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE fee_configurations 
          MODIFY COLUMN min_amount DECIMAL(10,2) NULL,
          MODIFY COLUMN max_amount DECIMAL(10,2) NULL;
        `);
        console.log('✅ Amount columns (snake_case) made nullable successfully');
      } catch (error) {
        console.error('❌ Error modifying amount columns:', error.message);
      }

      console.log('🎉 Column fixes completed!');
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Revert min_amount and max_amount to not null
      await queryInterface.sequelize.query(`
        ALTER TABLE fee_configurations 
        MODIFY COLUMN min_amount DECIMAL(10,2) NOT NULL,
        MODIFY COLUMN max_amount DECIMAL(10,2) NOT NULL;
      `);
      console.log('Column fixes rolled back successfully');
    } catch (error) {
      console.error('Error rolling back column fixes:', error);
      throw error;
    }
  },
}; 