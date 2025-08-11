'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('pricing_plans', [
      {
        name: 'Free',
        slug: 'free',
        monthly_price: 0.00,
        yearly_price: 0.00,
        description: 'Perfect pentru începători și proiecte mici',
        features: JSON.stringify([
          { name: 'Keywords tracking', included: true, limit: '5 keywords' },
          { name: 'Website analysis', included: true, limit: '1 website' },
          { name: 'Basic reports', included: true },
          { name: 'Email support', included: true },
          { name: 'Advanced analytics', included: false },
          { name: 'Competitor analysis', included: false },
          { name: 'API access', included: false },
          { name: 'Custom reports', included: false }
        ]),
        is_popular: false,
        is_active: true,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Pro',
        slug: 'pro',
        monthly_price: 49.00,
        yearly_price: 39.20, // 20% discount
        description: 'Ideal pentru agenții și freelanceri',
        features: JSON.stringify([
          { name: 'Keywords tracking', included: true, limit: '100 keywords' },
          { name: 'Website analysis', included: true, limit: '5 websites' },
          { name: 'Basic reports', included: true },
          { name: 'Email support', included: true },
          { name: 'Advanced analytics', included: true },
          { name: 'Competitor analysis', included: true, limit: '10 competitors' },
          { name: 'API access', included: true, limit: '1000 calls/month' },
          { name: 'Custom reports', included: true }
        ]),
        is_popular: true,
        is_active: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        monthly_price: 199.00,
        yearly_price: 159.20, // 20% discount
        description: 'Pentru echipe mari și agenții enterprise',
        features: JSON.stringify([
          { name: 'Keywords tracking', included: true, limit: 'Unlimited' },
          { name: 'Website analysis', included: true, limit: 'Unlimited' },
          { name: 'Basic reports', included: true },
          { name: 'Priority support', included: true },
          { name: 'Advanced analytics', included: true },
          { name: 'Competitor analysis', included: true, limit: 'Unlimited' },
          { name: 'API access', included: true, limit: 'Unlimited' },
          { name: 'Custom reports', included: true },
          { name: 'White-label reports', included: true },
          { name: 'Team collaboration', included: true }
        ]),
        is_popular: false,
        is_active: true,
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('pricing_plans', null, {});
  }
};