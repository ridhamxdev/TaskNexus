'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Get current table description to check existing columns
      const tableInfo = await queryInterface.describeTable('tenants');
      
      // Add age column only if it doesn't exist
      if (!tableInfo.age) {
        console.log('Adding age column to tenants table...');
        await queryInterface.addColumn('tenants', 'age', {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Organization age in years'
        });
        console.log('✅ Age column added successfully');
      } else {
        console.log('⚠️ Age column already exists, skipping...');
      }

      // Make subdomain column nullable if it isn't already
      if (tableInfo.subdomain && !tableInfo.subdomain.allowNull) {
        console.log('Making subdomain column nullable...');
        await queryInterface.changeColumn('tenants', 'subdomain', {
          type: DataTypes.STRING,
          allowNull: true,
          unique: true
        });
        console.log('✅ Subdomain column made nullable');
      } else {
        console.log('⚠️ Subdomain column already nullable, skipping...');
      }

      // Make admin_user_id column nullable if it isn't already
      if (tableInfo.admin_user_id && !tableInfo.admin_user_id.allowNull) {
        console.log('Making admin_user_id column nullable...');
        
        // Check and handle existing foreign key constraints
        console.log('Checking for existing foreign key constraints...');
        const constraints = await queryInterface.sequelize.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'tenants' 
          AND COLUMN_NAME = 'admin_user_id' 
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `, { type: queryInterface.sequelize.QueryTypes.SELECT });

        // Remove existing foreign key constraints
        for (const constraint of constraints) {
          try {
            console.log(`Removing constraint: ${constraint.CONSTRAINT_NAME}`);
            await queryInterface.removeConstraint('tenants', constraint.CONSTRAINT_NAME);
          } catch (error) {
            console.log(`Note: Could not remove constraint ${constraint.CONSTRAINT_NAME}: ${error.message}`);
          }
        }

        // Check and remove existing indexes on admin_user_id
        console.log('Checking for existing indexes...');
        const indexes = await queryInterface.sequelize.query(`
          SHOW INDEX FROM tenants WHERE Column_name = 'admin_user_id'
        `, { type: queryInterface.sequelize.QueryTypes.SELECT });

        for (const index of indexes) {
          if (index.Key_name !== 'PRIMARY') {
            try {
              console.log(`Removing index: ${index.Key_name}`);
              await queryInterface.removeIndex('tenants', index.Key_name);
            } catch (error) {
              console.log(`Note: Could not remove index ${index.Key_name}: ${error.message}`);
            }
          }
        }

        // Now modify the column to allow NULL
        console.log('Modifying admin_user_id column to allow NULL...');
        await queryInterface.changeColumn('tenants', 'admin_user_id', {
          type: DataTypes.INTEGER,
          allowNull: true
        });

        // Check if the foreign key constraint already exists before creating
        const existingConstraints = await queryInterface.sequelize.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'tenants' 
          AND COLUMN_NAME = 'admin_user_id' 
          AND CONSTRAINT_NAME = 'fk_tenants_admin_user_id'
        `, { type: queryInterface.sequelize.QueryTypes.SELECT });

        if (existingConstraints.length === 0) {
          console.log('Creating new foreign key constraint...');
          await queryInterface.addConstraint('tenants', {
            fields: ['admin_user_id'],
            type: 'foreign key',
            name: 'fk_tenants_admin_user_id',
            references: {
              table: 'users',
              field: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          });
        } else {
          console.log('⚠️ Foreign key constraint already exists, skipping...');
        }

        // Check if the index already exists before creating
        const existingIndexes = await queryInterface.sequelize.query(`
          SHOW INDEX FROM tenants WHERE Column_name = 'admin_user_id' AND Key_name = 'idx_tenants_admin_user_id'
        `, { type: queryInterface.sequelize.QueryTypes.SELECT });

        if (existingIndexes.length === 0) {
          console.log('Creating new index...');
          await queryInterface.addIndex('tenants', ['admin_user_id'], {
            name: 'idx_tenants_admin_user_id'
          });
        } else {
          console.log('⚠️ Index already exists, skipping...');
        }

        console.log('✅ admin_user_id column made nullable with proper foreign key constraint');
      } else {
        console.log('⚠️ admin_user_id column already nullable, skipping...');
      }

      console.log('🎉 Tenant table simplification completed successfully!');
    } catch (error) {
      console.error('❌ Error in migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Get current table description
      const tableInfo = await queryInterface.describeTable('tenants');

      // Remove age column if it exists
      if (tableInfo.age) {
        console.log('Removing age column...');
        await queryInterface.removeColumn('tenants', 'age');
        console.log('✅ Age column removed');
      }

      // Make subdomain required again (note: this might fail if there are null values)
      if (tableInfo.subdomain && tableInfo.subdomain.allowNull) {
        console.log('Making subdomain column required...');
        await queryInterface.changeColumn('tenants', 'subdomain', {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        });
        console.log('✅ Subdomain column made required');
      }

      // Make admin_user_id required again (note: this might fail if there are null values)
      if (tableInfo.admin_user_id && tableInfo.admin_user_id.allowNull) {
        console.log('Making admin_user_id column required...');
        
        // Remove the current foreign key constraint if it exists
        try {
          await queryInterface.removeConstraint('tenants', 'fk_tenants_admin_user_id');
          console.log('Removed foreign key constraint');
        } catch (error) {
          console.log('Note: Could not remove constraint, continuing...');
        }

        // Change column back to NOT NULL
        await queryInterface.changeColumn('tenants', 'admin_user_id', {
          type: DataTypes.INTEGER,
          allowNull: false
        });

        // Recreate foreign key constraint with CASCADE
        await queryInterface.addConstraint('tenants', {
          fields: ['admin_user_id'],
          type: 'foreign key',
          name: 'fk_tenants_admin_user_id',
          references: {
            table: 'users',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        });

        console.log('✅ admin_user_id column made required');
      }

      console.log('🎉 Migration rollback completed successfully!');
    } catch (error) {
      console.error('❌ Error in rollback:', error.message);
      throw error;
    }
  }
}; 