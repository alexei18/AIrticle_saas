'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  SimpleGrid,
  Badge,
  Center,
  Loader,
} from '@mantine/core';
import {
  IconChartLine,
  IconEdit,
  IconSearch,
  IconBrandGoogle,
  IconArrowRight,
} from '@tabler/icons-react';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Hero Section */}
        <Stack align="center" gap="lg" py="xl">
          <Badge size="lg" variant="light" color="brand">
            SEO Analytics & Content Generation
          </Badge>
          
          <Title 
            ta="center" 
            size="3.5rem" 
            fw={700}
            style={{ lineHeight: 1.2 }}
          >
            Platformă SaaS pentru
            <Text 
              component="span" 
              inherit 
              variant="gradient" 
              gradient={{ from: 'brand', to: 'cyan' }}
            >
              {' '}SEO & Content{' '}
            </Text>
            Inteligent
          </Title>

          <Text 
            ta="center" 
            size="xl" 
            maw={600} 
            c="dimmed"
          >
            Analizează website-ul tău, generează conținut optimizat SEO și monitorizează performanțele 
            într-o singură platformă inteligentă.
          </Text>

          <Group gap="md" mt="lg">
            <Button 
              size="lg" 
              leftSection={<IconArrowRight size={20} />}
              onClick={() => router.push('/register')}
            >
              Încearcă Gratuit 14 Zile
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => router.push('/login')}
            >
              Conectează-te
            </Button>
          </Group>
        </Stack>

        {/* Features */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mt="xl">
          <Card>
            <Stack align="center" gap="md">
              <IconChartLine size={48} color="var(--mantine-color-brand-6)" />
              <Title order={3}>Analiză Website Completă</Title>
              <Text ta="center" c="dimmed">
                Audit tehnic, analiză conținut și performanțe SEO într-un singur raport detaliat
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack align="center" gap="md">
              <IconEdit size={48} color="var(--mantine-color-brand-6)" />
              <Title order={3}>Generare Conținut AI</Title>
              <Text ta="center" c="dimmed">
                Creează articole optimizate SEO de 1500-3000 cuvinte cu AI avansat
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack align="center" gap="md">
              <IconSearch size={48} color="var(--mantine-color-brand-6)" />
              <Title order={3}>Keyword Intelligence</Title>
              <Text ta="center" c="dimmed">
                Descoperă cuvinte cheie profitabile și monitorizează poziții în timp real
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Pricing Preview */}
        <Stack align="center" gap="lg" mt="xl">
          <Title order={2} ta="center">
            Planuri Accesibile pentru Orice Business
          </Title>
          
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" w="100%">
            {[
              {
                name: 'Starter',
                price: '€79',
                features: ['3 website-uri', '25 articole/lună', '500 keywords tracking'],
              },
              {
                name: 'Professional',
                price: '€199',
                features: ['15 website-uri', '100 articole/lună', '2000 keywords tracking'],
                popular: true,
              },
              {
                name: 'Enterprise',
                price: '€499',
                features: ['Website-uri nelimitate', '500 articole/lună', 'Keywords nelimitate'],
              },
            ].map((plan) => (
              <Card 
                key={plan.name} 
                bg={plan.popular ? 'brand.0' : undefined}
                style={{ position: 'relative' }}
              >
                {plan.popular && (
                  <Badge 
                    variant="filled" 
                    style={{ position: 'absolute', top: -10, right: 20 }}
                  >
                    Popular
                  </Badge>
                )}
                
                <Stack align="center" gap="md">
                  <Title order={3}>{plan.name}</Title>
                  <Text size="2rem" fw={700} c="brand">
                    {plan.price}
                    <Text component="span" size="md" c="dimmed" fw={400}>
                      /lună
                    </Text>
                  </Text>
                  
                  <Stack gap="xs" w="100%">
                    {plan.features.map((feature) => (
                      <Text key={feature} ta="center" size="sm">
                        • {feature}
                      </Text>
                    ))}
                  </Stack>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>

        {/* CTA */}
        <Card bg="brand.0" mt="xl">
          <Stack align="center" gap="md">
            <IconBrandGoogle size={48} color="var(--mantine-color-brand-6)" />
            <Title order={2} ta="center">
              Gata să-ți Îmbunătățești SEO-ul?
            </Title>
            <Text ta="center" size="lg" c="dimmed">
              Începe cu o probă gratuită de 14 zile. Fără card de credit necesar.
            </Text>
            <Button 
              size="lg" 
              leftSection={<IconArrowRight size={20} />}
              onClick={() => router.push('/register')}
            >
              Începe Acum Gratuit
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}