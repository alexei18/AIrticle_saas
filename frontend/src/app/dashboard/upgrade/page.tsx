'use client';

import { useState, useEffect } from 'react';
import { 
  Paper,
  Group,
  Text,
  Title,
  Button,
  Stack,
  Grid,
  Card,
  Badge,
  ThemeIcon,
  Container,
  List,
  Center,
  Loader
} from '@mantine/core';
import { 
  IconCheck, 
  IconX, 
  IconCrown, 
  IconBolt, 
  IconStar,
  IconShield,
  IconChartBar,
  IconUsers,
  IconClock,
  IconArrowRight,
  IconSparkles
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'month' | 'year';
  popular?: boolean;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  buttonVariant: 'outline' | 'primary' | 'premium';
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billingPeriod: 'month',
    description: 'Perfect pentru începători și proiecte mici',
    features: [
      { name: 'Keywords tracking', included: true, limit: '5 keywords' },
      { name: 'Website analysis', included: true, limit: '1 website' },
      { name: 'Basic reports', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced analytics', included: false },
      { name: 'Competitor analysis', included: false },
      { name: 'API access', included: false },
      { name: 'Custom reports', included: false },
    ],
    buttonText: 'Planul Curent',
    buttonVariant: 'outline'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    billingPeriod: 'month',
    popular: true,
    description: 'Ideal pentru agenții și freelanceri',
    features: [
      { name: 'Keywords tracking', included: true, limit: '100 keywords' },
      { name: 'Website analysis', included: true, limit: '5 websites' },
      { name: 'Basic reports', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Competitor analysis', included: true, limit: '10 competitors' },
      { name: 'API access', included: true, limit: '1000 calls/month' },
      { name: 'Custom reports', included: true },
    ],
    buttonText: 'Upgrade la Pro',
    buttonVariant: 'primary'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    billingPeriod: 'month',
    description: 'Pentru echipe mari și agenții enterprise',
    features: [
      { name: 'Keywords tracking', included: true, limit: 'Unlimited' },
      { name: 'Website analysis', included: true, limit: 'Unlimited' },
      { name: 'Basic reports', included: true },
      { name: 'Priority support', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Competitor analysis', included: true, limit: 'Unlimited' },
      { name: 'API access', included: true, limit: 'Unlimited' },
      { name: 'Custom reports', included: true },
      { name: 'White-label reports', included: true },
      { name: 'Team collaboration', included: true },
    ],
    buttonText: 'Upgrade la Enterprise',
    buttonVariant: 'premium'
  }
];

const features = [
  {
    icon: IconChartBar,
    title: 'Analytics Avansate',
    description: 'Obține insights detaliate despre performanța keywords-urilor și traficul organic.'
  },
  {
    icon: IconUsers,
    title: 'Analiza Competitorilor',
    description: 'Monitorizează strategiile concurenților și identifică noi oportunități.'
  },
  {
    icon: IconBolt,
    title: 'API Access',
    description: 'Integrează datele în propriile aplicații cu API-ul nostru robust.'
  },
  {
    icon: IconShield,
    title: 'Support Prioritar',
    description: 'Primește ajutor rapid de la echipa noastră de experți.'
  },
  {
    icon: IconStar,
    title: 'Rapoarte Custom',
    description: 'Creează rapoarte personalizate pentru clienții tăi.'
  },
  {
    icon: IconClock,
    title: 'Actualizări în Timp Real',
    description: 'Date fresh actualizate zilnic pentru decizii informate.'
  }
];

export default function UpgradePage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricingPlans();
  }, []);

  const fetchPricingPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/pricing', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const formattedPlans = result.data.map((plan: any) => ({
          id: plan.slug,
          name: plan.name,
          price: billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
          billingPeriod: billingPeriod,
          popular: plan.isPopular,
          description: plan.description,
          features: plan.features,
          buttonText: plan.slug === 'free' ? 'Planul Curent' : `Upgrade la ${plan.name}`,
          buttonVariant: plan.slug === 'enterprise' ? 'premium' : plan.slug === 'pro' ? 'primary' : 'outline'
        }));
        setPlans(formattedPlans);
      } else {
        throw new Error(result.error || 'Failed to fetch pricing plans');
      }
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      // Fallback to hardcoded plans
      setPlans([
        {
          id: 'free',
          name: 'Free',
          price: 0,
          billingPeriod: 'month',
          description: 'Perfect pentru începători și proiecte mici',
          features: [
            { name: 'Keywords tracking', included: true, limit: '5 keywords' },
            { name: 'Website analysis', included: true, limit: '1 website' },
            { name: 'Basic reports', included: true },
            { name: 'Email support', included: true },
            { name: 'Advanced analytics', included: false },
            { name: 'Competitor analysis', included: false },
            { name: 'API access', included: false },
            { name: 'Custom reports', included: false },
          ],
          buttonText: 'Planul Curent',
          buttonVariant: 'outline'
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 49,
          billingPeriod: 'month',
          popular: true,
          description: 'Ideal pentru agenții și freelanceri',
          features: [
            { name: 'Keywords tracking', included: true, limit: '100 keywords' },
            { name: 'Website analysis', included: true, limit: '5 websites' },
            { name: 'Basic reports', included: true },
            { name: 'Email support', included: true },
            { name: 'Advanced analytics', included: true },
            { name: 'Competitor analysis', included: true, limit: '10 competitors' },
            { name: 'API access', included: true, limit: '1000 calls/month' },
            { name: 'Custom reports', included: true },
          ],
          buttonText: 'Upgrade la Pro',
          buttonVariant: 'primary'
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 199,
          billingPeriod: 'month',
          description: 'Pentru echipe mari și agenții enterprise',
          features: [
            { name: 'Keywords tracking', included: true, limit: 'Unlimited' },
            { name: 'Website analysis', included: true, limit: 'Unlimited' },
            { name: 'Basic reports', included: true },
            { name: 'Priority support', included: true },
            { name: 'Advanced analytics', included: true },
            { name: 'Competitor analysis', included: true, limit: 'Unlimited' },
            { name: 'API access', included: true, limit: 'Unlimited' },
            { name: 'Custom reports', included: true },
            { name: 'White-label reports', included: true },
            { name: 'Team collaboration', included: true },
          ],
          buttonText: 'Upgrade la Enterprise',
          buttonVariant: 'premium'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Update plans when billing period changes
  useEffect(() => {
    if (plans.length > 0) {
      fetchPricingPlans();
    }
  }, [billingPeriod]);

  const handleUpgrade = async (planId: string) => {
    setIsLoading(planId);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      notifications.show({
        title: 'Succes!',
        message: `Upgrade la planul ${planId} inițiat cu succes!`,
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error) {
      notifications.show({
        title: 'Eroare!',
        message: 'Eroare la procesarea upgrade-ului. Te rugăm să încerci din nou.',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Container size="xl" p="xl">
      <Stack gap="xl">
        {/* Header */}
        <Center>
          <Stack align="center" gap="lg">
            <ThemeIcon size={80} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'grape' }}>
              <IconCrown size={40} />
            </ThemeIcon>
            <Stack align="center" gap="md">
              <Title order={1} ta="center" size={48}>
                Upgrade Your SEO Game
              </Title>
              <Text size="xl" c="dimmed" ta="center" maw={600}>
                Deblochează funcționalități premium și accelerează-ți creșterea organică cu planurile noastre avansate.
              </Text>
            </Stack>
          </Stack>
        </Center>

        {/* Billing Toggle */}
        <Center>
          <Paper withBorder p={4} radius="md">
            <Group>
              <Button
                variant={billingPeriod === 'monthly' ? 'filled' : 'subtle'}
                onClick={() => setBillingPeriod('monthly')}
              >
                Lunar
              </Button>
              <Button
                variant={billingPeriod === 'yearly' ? 'filled' : 'subtle'}
                onClick={() => setBillingPeriod('yearly')}
                rightSection={
                  <Badge size="sm" color="green" variant="filled">
                    -20%
                  </Badge>
                }
              >
                Anual
              </Button>
            </Group>
          </Paper>
        </Center>

        {/* Loading State */}
        {loading ? (
          <Center h="50vh">
            <Stack align="center">
              <Loader size="lg" />
              <Text>Se încarcă planurile...</Text>
            </Stack>
          </Center>
        ) : (
        <>
        {/* Pricing Cards */}
        <Grid>
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === 'free';
            const actualPrice = billingPeriod === 'yearly' && plan.price > 0 
              ? Math.round(plan.price * 0.8) 
              : plan.price;
            
            return (
              <Grid.Col key={plan.id} span={{ base: 12, md: 4 }}>
                <Card
                  withBorder
                  p="xl"
                  pos="relative"
                  style={{
                    border: plan.popular ? '2px solid var(--mantine-color-blue-5)' : undefined,
                    transform: plan.popular ? 'scale(1.05)' : undefined
                  }}
                >
                  {plan.popular && (
                    <Badge
                      size="lg"
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'grape' }}
                      pos="absolute"
                      top={-10}
                      left="50%"
                      style={{ transform: 'translateX(-50%)' }}
                      leftSection={<IconSparkles size={14} />}
                    >
                      Cel mai popular
                    </Badge>
                  )}

                  <Stack align="center" mb="xl">
                    <Title order={2} ta="center">{plan.name}</Title>
                    <Stack align="center" gap="xs">
                      <Group gap={4} align="baseline">
                        <Text size="3rem" fw={700}>${actualPrice}</Text>
                        {plan.price > 0 && (
                          <Text c="dimmed">/{billingPeriod === 'yearly' ? 'an' : 'lună'}</Text>
                        )}
                      </Group>
                      {billingPeriod === 'yearly' && plan.price > 0 && (
                        <Text size="sm" c="green" fw={500}>
                          Economisești ${(plan.price - actualPrice) * 12}/an
                        </Text>
                      )}
                    </Stack>
                    <Text ta="center" c="dimmed">{plan.description}</Text>
                  </Stack>

                  <List mb="xl" spacing="md" size="sm">
                    {plan.features.map((feature, index) => (
                      <List.Item
                        key={index}
                        icon={
                          <ThemeIcon 
                            size={20} 
                            radius="xl" 
                            color={feature.included ? 'green' : 'gray'}
                            variant={feature.included ? 'filled' : 'outline'}
                          >
                            {feature.included ? <IconCheck size={12} /> : <IconX size={12} />}
                          </ThemeIcon>
                        }
                      >
                        <Stack gap={4}>
                          <Text fw={500} c={feature.included ? undefined : 'dimmed'}>
                            {feature.name}
                          </Text>
                          {feature.limit && (
                            <Text size="xs" c="dimmed">{feature.limit}</Text>
                          )}
                        </Stack>
                      </List.Item>
                    ))}
                  </List>

                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan}
                    loading={isLoading === plan.id}
                    variant={plan.buttonVariant === 'premium' ? 'gradient' : plan.buttonVariant === 'primary' ? 'filled' : 'outline'}
                    gradient={plan.buttonVariant === 'premium' ? { from: 'grape', to: 'blue' } : undefined}
                    rightSection={!isCurrentPlan ? <IconArrowRight size={16} /> : undefined}
                    fullWidth
                    size="md"
                  >
                    {isLoading === plan.id ? 'Procesează...' : plan.buttonText}
                  </Button>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
        </>
        )}

        {/* Features Section */}
        <Paper
          p="xl"
          radius="xl"
          style={{ 
            background: 'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-grape-0) 100%)'
          }}
        >
          <Stack align="center" mb="xl">
            <Title order={2} ta="center" mb="md">
              De ce să alegi planurile Premium?
            </Title>
            <Text size="lg" c="dimmed" ta="center" maw={600}>
              Deblochează puterea completă a platformei noastre cu funcționalități avansate 
              care te vor ajuta să domină rezultatele de căutare.
            </Text>
          </Stack>

          <Grid>
            {features.map((feature, index) => (
              <Grid.Col key={index} span={{ base: 12, md: 6, lg: 4 }}>
                <Stack align="center" ta="center">
                  <ThemeIcon size={60} radius="xl" variant="light" color="blue">
                    <feature.icon size={30} />
                  </ThemeIcon>
                  <Title order={3}>{feature.title}</Title>
                  <Text c="dimmed">{feature.description}</Text>
                </Stack>
              </Grid.Col>
            ))}
          </Grid>
        </Paper>

        {/* FAQ Section */}
        <Container size="lg">
          <Title order={2} ta="center" mb="xl">
            Întrebări Frecvente
          </Title>

          <Stack gap="md">
            {[
              {
                question: 'Pot să schimb planul oricând?',
                answer: 'Da, poți face upgrade sau downgrade oricând. Modificările se vor aplica la următoarea perioadă de facturare.'
              },
              {
                question: 'Există o perioadă de testare?',
                answer: 'Oferim o garanție de rambursare de 14 zile pentru toate planurile premium. Dacă nu ești mulțumit, îți returnăm banii.'
              },
              {
                question: 'Ce se întâmplă cu datele mele dacă fac downgrade?',
                answer: 'Datele tale rămân în siguranță. Vei avea acces limitat la funcționalități, dar informațiile nu se pierd.'
              },
              {
                question: 'Oferiți reduceri pentru plățile anuale?',
                answer: 'Da! Economisești 20% când alegi facturarea anuală față de cea lunară.'
              },
              {
                question: 'Cum funcționează suportul prioritar?',
                answer: 'Utilizatorii planurilor premium au acces la suport prin email cu răspuns în maxim 24 de ore și chat live în timpul programului.'
              }
            ].map((faq, index) => (
              <Card key={index} withBorder p="lg">
                <Title order={4} mb="sm">{faq.question}</Title>
                <Text c="dimmed">{faq.answer}</Text>
              </Card>
            ))}
          </Stack>
        </Container>

        {/* CTA Section */}
        <Paper
          p="xl"
          radius="xl"
          style={{
            background: 'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-grape-6) 100%)',
            color: 'white'
          }}
        >
          <Stack align="center" gap="xl">
            <Stack align="center" gap="md">
              <Title order={2} ta="center" c="white">
                Gata să-ți accelerezi SEO-ul?
              </Title>
              <Text size="xl" ta="center" opacity={0.9}>
                Alătură-te miilor de marketeri care și-au îmbunătățit rezultatele cu platforma noastră.
              </Text>
            </Stack>
            <Group>
              <Button 
                onClick={() => handleUpgrade('pro')}
                size="lg"
                variant="white"
                color="blue"
                leftSection={<IconCrown size={20} />}
              >
                Începe cu Pro
              </Button>
              <Button 
                size="lg"
                variant="outline"
                color="white"
              >
                Vorbește cu un specialist
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}