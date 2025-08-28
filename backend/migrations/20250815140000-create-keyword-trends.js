'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('keyword_trends', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      keyword_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'keywords',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      interest_score: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add a unique constraint to prevent duplicate entries for the same keyword on the same day
    await queryInterface.addConstraint('keyword_trends', {
      fields: ['keyword_id', 'date'],
      type: 'unique',
      name: 'unique_keyword_date_trend'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('keyword_trends');
  }
};
