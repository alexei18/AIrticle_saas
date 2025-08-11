'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('crawled_pages', 'ai_recommendations', {
      type: Sequelize.JSON,
      allowNull: true,
      after: 'issues' // Poziționăm coloana după 'issues' pentru organizare
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('crawled_pages', 'ai_recommendations');
  }
};