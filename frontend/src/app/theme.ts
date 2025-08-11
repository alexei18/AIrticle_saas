import { createTheme, MantineColorsTuple } from '@mantine/core';

const brand: MantineColorsTuple = [
  '#e7f5ff',
  '#d0ebff',
  '#a5d8ff',
  '#74c0fc',
  '#339af0',
  '#228be6',
  '#1c7ed6',
  '#1971c2',
  '#1864ab',
  '#145392'
];

export const theme = createTheme({
  colors: {
    brand,
  },
  primaryColor: 'brand',
  defaultRadius: 'md',
  fontFamily: 'Inter, sans-serif',
  headings: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: '600',
  },
  components: {
    Button: {
      defaultProps: {
        fw: 500,
      },
    },
    Card: {
      defaultProps: {
        padding: 'lg',
        radius: 'md',
        withBorder: true,
      },
    },
    Paper: {
      defaultProps: {
        p: 'md',
        radius: 'md',
      },
    },
  },
});