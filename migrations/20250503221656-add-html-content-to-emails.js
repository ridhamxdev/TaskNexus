'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if htmlContent column exists before adding it
      const [columns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM emails LIKE 'htmlContent'"
      );
      
      if (columns.length === 0) {
        // Add htmlContent column only if it doesn't exist
        await queryInterface.addColumn('emails', 'htmlContent', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
      
      // Check if retryCount column exists before adding it
      const [retryColumns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM emails LIKE 'retryCount'"
      );
      
      if (retryColumns.length === 0) {
        // Add retryCount column only if it doesn't exist
        await queryInterface.addColumn('emails', 'retryCount', {
          type: Sequelize.INTEGER,
          defaultValue: 0
        });
      }
      
      // Check if error column exists before adding it
      const [errorColumns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM emails LIKE 'error'"
      );
      
      if (errorColumns.length === 0) {
        // Add error column only if it doesn't exist
        await queryInterface.addColumn('emails', 'error', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
      
      // Modify status ENUM to include 'pending'
      const [statusColumns] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM emails LIKE 'status'"
      );
      
      if (statusColumns.length > 0) {
        // Get the current enum values
        const enumValues = statusColumns[0].Type.match(/enum\('([^']*)'(?:,'([^']*)')*\)/i);
        
        if (enumValues) {
          // Check if 'pending' is already in the enum
          const values = enumValues.slice(1).filter(Boolean);
          if (!values.includes('pending')) {
            // Add 'pending' to the enum
            values.push('pending');
            
            // Update the column
            await queryInterface.changeColumn('emails', 'status', {
              type: Sequelize.ENUM(...values),
              defaultValue: 'pending'
            });
          }
        }
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove columns
      await queryInterface.removeColumn('emails', 'htmlContent');
      await queryInterface.removeColumn('emails', 'retryCount');
      await queryInterface.removeColumn('emails', 'error');
      
      // Revert status ENUM (this is tricky with MySQL, may need manual intervention)
      const [results] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM emails LIKE 'status'"
      );
      
      if (results.length > 0) {
        // Get the current enum values
        const enumValues = results[0].Type.match(/enum\('([^']*)'(?:,'([^']*)')*\)/i);
        
        if (enumValues) {
          // Filter out 'pending'
          const values = enumValues.slice(1).filter(val => val && val !== 'pending');
          
          // Update the column
          await queryInterface.changeColumn('emails', 'status', {
            type: Sequelize.ENUM(...values),
            defaultValue: 'sent'
          });
        }
      }
      
      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};
