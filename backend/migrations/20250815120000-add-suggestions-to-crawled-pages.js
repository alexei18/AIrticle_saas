'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('crawled_pages', 'suggestions', {
      type: Sequelize.JSON,
      allowNull: true,
      after: 'issues'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('crawled_pages', 'suggestions');
  }
};
