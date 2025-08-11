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
  Center,
  Select,
  Checkbox,
  Progress,
  List,
  ThemeIcon
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconMail, 
  IconLock, 
  IconAlertCircle, 
  IconUser, 
  IconBrandGoogle,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { useAuthStore } from '@/store/authStore';

interface PasswordStrength {
  score: number;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });
  
  const router = useRouter();
  const { register, isAuthenticated, checkAuth } = useAuthStore();

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      planType: 'starter',
      acceptTerms: false,
      acceptMarketing: false,
    },
    validate: {
      firstName: (val) => (val.length < 2 ? 'Prenumele trebuie să aibă cel puțin 2 caractere' : null),
      lastName: (val) => (val.length < 2 ? 'Numele trebuie să aibă cel puțin 2 caractere' : null),
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Email invalid'),
      password: (val) => {
        if (val.length < 8) return 'Parola trebuie să aibă cel puțin 8 caractere';
        if (passwordStrength.score < 60) return 'Parola este prea slabă';
        return null;
      },
      confirmPassword: (val, values) =>
        val !== values.password ? 'Parolele nu se potrivesc' : null,
      acceptTerms: (val) => (!val ? 'Trebuie să accepți termenii și condițiile' : null),
    },
  });

  useEffect(() => {
    checkAuth();
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const password = form.values.password;
    const strength = calculatePasswordStrength(password);
    setPasswordStrength(strength);
  }, [form.values.password]);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length * 20;
    
    return { score, checks };
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score < 40) return 'red';
    if (score < 80) return 'orange';
    return 'green';
  };

  const getPasswordStrengthLabel = (score: number) => {
    if (score < 40) return 'Slabă';
    if (score < 80) return 'Medie';
    return 'Puternică';
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError('');
    
    try {
      await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        planType: values.planType,
      });
      
      notifications.show({
        title: 'Cont creat cu succes!',
        message: 'Bine ai venit! Contul tău a fost creat și ai 14 zile de probă gratuită.',
        color: 'green',
      });
      
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.error || err?.message || 'A apărut o eroare la înregistrare';
      setError(errorMessage);
      
      notifications.show({
        title: 'Eroare la înregistrare',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Center>
          <Stack align="center" gap="sm">
            <Title order={1} size="2.5rem" fw={700} ta="center">
              Creează cont nou
            </Title>
            <Text size="lg" c="dimmed" ta="center">
              Începe cu o probă gratuită de 14 zile
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
              <Group grow>
                <TextInput
                  required
                  label="Prenume"
                  placeholder="Ion"
                  leftSection={<IconUser size={16} />}
                  value={form.values.firstName}
                  onChange={(event) => form.setFieldValue('firstName', event.currentTarget.value)}
                  error={form.errors.firstName}
                  radius="md"
                />

                <TextInput
                  required
                  label="Nume"
                  placeholder="Popescu"
                  leftSection={<IconUser size={16} />}
                  value={form.values.lastName}
                  onChange={(event) => form.setFieldValue('lastName', event.currentTarget.value)}
                  error={form.errors.lastName}
                  radius="md"
                />
              </Group>

              <TextInput
                required
                label="Email"
                placeholder="exemplu@email.com"
                leftSection={<IconMail size={16} />}
                value={form.values.email}
                onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
                error={form.errors.email}
                radius="md"
              />

              <Select
                label="Plan de abonament"
                placeholder="Alege planul dorit"
                value={form.values.planType}
                onChange={(value) => form.setFieldValue('planType', value || 'starter')}
                data={[
                  { value: 'starter', label: 'Starter - €79/lună (3 website-uri, 25 articole)' },
                  { value: 'professional', label: 'Professional - €199/lună (15 website-uri, 100 articole)' },
                  { value: 'enterprise', label: 'Enterprise - €499/lună (nelimitat)' }
                ]}
                radius="md"
              />

              <div>
                <PasswordInput
                  required
                  label="Parolă"
                  placeholder="Parola ta"
                  leftSection={<IconLock size={16} />}
                  value={form.values.password}
                  onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
                  error={form.errors.password}
                  radius="md"
                />
                
                {form.values.password && (
                  <Stack gap="xs" mt="xs">
                    <Group justify="space-between">
                      <Text size="sm">Puterea parolei:</Text>
                      <Text size="sm" c={getPasswordStrengthColor(passwordStrength.score)}>
                        {getPasswordStrengthLabel(passwordStrength.score)}
                      </Text>
                    </Group>
                    <Progress 
                      value={passwordStrength.score} 
                      color={getPasswordStrengthColor(passwordStrength.score)}
                      size="xs"
                    />
                    <List size="xs" spacing={2}>
                      <List.Item 
                        icon={
                          <ThemeIcon size={16} color={passwordStrength.checks.length ? 'green' : 'red'} variant="light">
                            {passwordStrength.checks.length ? <IconCheck size={12} /> : <IconX size={12} />}
                          </ThemeIcon>
                        }
                      >
                        Cel puțin 8 caractere
                      </List.Item>
                      <List.Item 
                        icon={
                          <ThemeIcon size={16} color={passwordStrength.checks.uppercase ? 'green' : 'red'} variant="light">
                            {passwordStrength.checks.uppercase ? <IconCheck size={12} /> : <IconX size={12} />}
                          </ThemeIcon>
                        }
                      >
                        O literă mare
                      </List.Item>
                      <List.Item 
                        icon={
                          <ThemeIcon size={16} color={passwordStrength.checks.lowercase ? 'green' : 'red'} variant="light">
                            {passwordStrength.checks.lowercase ? <IconCheck size={12} /> : <IconX size={12} />}
                          </ThemeIcon>
                        }
                      >
                        O literă mică
                      </List.Item>
                      <List.Item 
                        icon={
                          <ThemeIcon size={16} color={passwordStrength.checks.number ? 'green' : 'red'} variant="light">
                            {passwordStrength.checks.number ? <IconCheck size={12} /> : <IconX size={12} />}
                          </ThemeIcon>
                        }
                      >
                        Un număr
                      </List.Item>
                    </List>
                  </Stack>
                )}
              </div>

              <PasswordInput
                required
                label="Confirmă parola"
                placeholder="Confirmă parola"
                leftSection={<IconLock size={16} />}
                value={form.values.confirmPassword}
                onChange={(event) => form.setFieldValue('confirmPassword', event.currentTarget.value)}
                error={form.errors.confirmPassword}
                radius="md"
              />

              <Stack gap="xs">
                <Checkbox
                  label="Accept termenii și condițiile de utilizare"
                  checked={form.values.acceptTerms}
                  onChange={(event) => form.setFieldValue('acceptTerms', event.currentTarget.checked)}
                  error={form.errors.acceptTerms}
                />
                
                <Checkbox
                  label="Doresc să primesc actualizări și oferte speciale prin email"
                  checked={form.values.acceptMarketing}
                  onChange={(event) => form.setFieldValue('acceptMarketing', event.currentTarget.checked)}
                />
              </Stack>

              <Button
                type="submit"
                size="md"
                radius="md"
                loading={loading}
                fullWidth
              >
                Creează cont gratuit
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
            Înregistrează-te cu Google (În curând)
          </Button>

          <Text ta="center" mt="md">
            Ai deja cont?{' '}
            <Anchor fw={500} onClick={() => router.push('/login')}>
              Conectează-te aici
            </Anchor>
          </Text>
        </Paper>

        <Paper radius="md" p="md" bg="green.0" withBorder>
          <Text size="sm" ta="center" c="green.8">
            <strong>✨ Probă gratuită 14 zile</strong><br />
            Fără card de credit • Anulare oricând • Acces complet
          </Text>
        </Paper>
      </Stack>
    </Container>
  );
}