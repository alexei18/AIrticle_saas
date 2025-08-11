import { Center, Loader, Stack, Text } from '@mantine/core';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function LoadingSpinner({ 
  text = 'Se încarcă...', 
  size = 'lg' 
}: LoadingSpinnerProps) {
  return (
    <Center h="50vh">
      <Stack align="center" gap="md">
        <Loader size={size} />
        <Text>{text}</Text>
      </Stack>
    </Center>
  );
}