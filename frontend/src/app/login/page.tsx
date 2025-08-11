'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Stack,
  Anchor,
  Alert,
  LoadingOverlay,
  Divider,
  Center
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconAlertCircle, IconBrandGoogle } from '@tabler/icons-react';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, isAuthenticated, checkAuth } = useAuthStore();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Email invalid'),
      password: (val) => (val.length < 6 ? 'Parola trebuie să aibă cel puțin 6 caractere' : null),
    },
  });

  useEffect(() => {
    checkAuth();
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated]);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError('');
    
    try {
      await login(values.email, values.password);
      
      notifications.show({
        title: 'Conectare reușită!',
        message: 'Bine ai revenit! Te redirectăm către dashboard.',
        color: 'green',
      });
      
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.error || err?.message || 'A apărut o eroare la conectare';
      setError(errorMessage);
      
      notifications.show({
        title: 'Eroare la conectare',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Stack gap="xl">
        <Center>
          <Stack align="center" gap="sm">
            <Title order={1} size="2.5rem" fw={700} ta="center">
              Conectează-te
            </Title>
            <Text size="lg" c="dimmed" ta="center">
              Bine ai revenit! Conectează-te la contul tău.
            </Text>
          </Stack>
        </Center>

        <Paper radius="md" p="xl" withBorder>
          <LoadingOverlay visible={loading} />
          
          {error && (
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              color="red" 
              mb="lg"
              variant="light"
            >
              {error}
            </Alert>
          )}

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                required
                label="Email"
                placeholder="exemplu@email.com"
                leftSection={<IconMail size={16} />}
                value={form.values.email}
                onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
                error={form.errors.email}
                radius="md"
                size="md"
              />

              <PasswordInput
                required
                label="Parolă"
                placeholder="Parola ta"
                leftSection={<IconLock size={16} />}
                value={form.values.password}
                onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
                error={form.errors.password}
                radius="md"
                size="md"
              />

              <Group justify="flex-end">
                <Anchor size="sm" onClick={() => router.push('/forgot-password')}>
                  Ai uitat parola?
                </Anchor>
              </Group>

              <Button
                type="submit"
                size="md"
                radius="md"
                loading={loading}
                fullWidth
              >
                Conectează-te
              </Button>
            </Stack>
          </form>

          <Divider label="sau" labelPosition="center" my="lg" />

          <Button
            variant="outline"
            size="md"
            radius="md"
            fullWidth
            leftSection={<IconBrandGoogle size={16} />}
            disabled
          >
            Conectează-te cu Google (În curând)
          </Button>

          <Text ta="center" mt="md">
            Nu ai cont?{' '}
            <Anchor fw={500} onClick={() => router.push('/register')}>
              Înregistrează-te aici
            </Anchor>
          </Text>
        </Paper>

        <Paper radius="md" p="md" bg="blue.0" withBorder>
          <Text size="sm" ta="center" c="blue.8">
            <strong>Demo Account:</strong><br />
            Email: demo@semrush-saas.com<br />
            Parolă: demo123
          </Text>
        </Paper>
      </Stack>
    </Container>
  );
}