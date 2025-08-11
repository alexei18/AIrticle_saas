'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Title,
    TextInput,
    Button,
    Group,
    Stack,
    Card,
    Text,
    Alert,
    Anchor
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconWorld, IconInfoCircle } from '@tabler/icons-react';
import { websitesApi } from '@/lib/api';

export default function NewWebsitePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: {
            name: '',
            domain: '',
        },
        validate: {
            name: (value) => (value.trim().length < 2 ? 'Numele trebuie să aibă cel puțin 2 caractere' : null),
            domain: (value) => {
                const cleanedDomain = value.trim().toLowerCase().replace(/^https?:\/\//, '');
                const domainRegex = /^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/;
                return domainRegex.test(cleanedDomain) ? null : 'Domeniu invalid';
            },
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            // Curățăm domeniul înainte de a-l trimite
            const cleanedDomain = values.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

            await websitesApi.create({ name: values.name.trim(), domain: cleanedDomain });

            notifications.show({
                title: 'Succes!',
                message: `Website-ul "${values.name}" a fost adăugat.`,
                color: 'green',
            });
            router.push('/dashboard/websites');
        } catch (error: any) {
            notifications.show({
                title: 'Eroare la adăugarea website-ului',
                message: error.response?.data?.error || 'A apărut o eroare neașteptată.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="xl">
            <Group>
                <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => router.push('/dashboard/websites')}
                >
                    Înapoi la Website-uri
                </Button>
            </Group>

            <Title order={1}>Adaugă un Website Nou</Title>

            <Card withBorder radius="md" p="xl">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="lg">
                        <Alert icon={<IconInfoCircle size={16} />} title="Informații importante">
                            Asigură-te că domeniul introdus este corect și accesibil public.
                            Nu include `https://` sau `www.` la început.
                        </Alert>

                        <TextInput
                            required
                            label="Nume Website"
                            placeholder="Ex: Magazinul Meu Online"
                            {...form.getInputProps('name')}
                        />
                        <TextInput
                            required
                            label="Domeniu"
                            placeholder="exemplu.com"
                            leftSection={<IconWorld size={16} />}
                            {...form.getInputProps('domain')}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button type="submit" loading={loading}>
                                Adaugă și Analizează
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Card>
        </Stack>
    );
}
