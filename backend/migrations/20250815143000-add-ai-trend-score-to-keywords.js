'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('keywords', 'ai_trend_score', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'enrichment_status'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('keywords', 'ai_trend_score');
  }
};
