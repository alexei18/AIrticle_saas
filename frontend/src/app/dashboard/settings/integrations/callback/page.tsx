'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Center, Loader, Stack, Text, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { googleAnalyticsApi } from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function GoogleAnalyticsCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state'); // Acesta este websiteId
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(`Google a returnat o eroare: ${errorParam}`);
                return;
            }

            if (!code || !state) {
                setError('Parametrii de callback lipsesc. Încearcă din nou.');
                return;
            }

            try {
                await googleAnalyticsApi.handleCallback(code, state);
                notifications.show({
                    title: 'Conectare reușită!',
                    message: 'Contul Google Analytics a fost conectat. Acum poți selecta o proprietate.',
                    color: 'green'
                });
                // Redirecționează înapoi la pagina de integrări
                router.push('/dashboard/settings/integrations');
            } catch (apiError: any) {
                setError(apiError.response?.data?.error || 'A apărut o eroare la finalizarea conexiunii.');
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <Center h="80vh">
            {error ? (
                <Alert color="red" title="Eroare de Conectare" icon={<IconAlertCircle />}>
                    <Text>{error}</Text>
                </Alert>
            ) : (
                <Stack align="center">
                    <Loader />
                    <Text>Se finalizează conexiunea cu Google Analytics...</Text>
                </Stack>
            )}
        </Center>
    );
}