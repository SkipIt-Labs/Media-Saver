import { createTheme, rem } from '@mantine/core';
import { tokens } from './tokens';

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: {
    brand: [
      '#E8EEFF',
      '#C8D6FF',
      '#A7BEFF',
      '#86A5FF',
      '#6A8EFF',
      tokens.accent,
      '#3F6CFF',
      '#3056E6',
      '#2442BD',
      '#1B3194'
    ]
  },
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    fontWeight: '700'
  },
  defaultRadius: tokens.radius.md,
  radius: {
    sm: rem(tokens.radius.sm),
    md: rem(tokens.radius.md),
    lg: rem(tokens.radius.lg),
    xl: rem(tokens.radius.xl)
  },
  components: {
    Card: {
      defaultProps: {
        radius: 'lg',
        withBorder: false,
        shadow: undefined
      }
    },
    Button: {
      styles: {
        root: {
          transition:
            'transform 120ms ease, filter 120ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease',
          willChange: 'transform'
        },
        label: { fontWeight: 650 }
      }
    },
    TextInput: {
      styles: {
        input: {
          backgroundColor: tokens.surface1,
          borderColor: tokens.border,
          transition: 'border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease'
        }
      }
    },
    NativeSelect: {
      styles: {
        input: {
          backgroundColor: tokens.surface1,
          borderColor: tokens.border,
          transition: 'border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease'
        }
      }
    },
    Checkbox: {
      styles: {
        input: {
          borderColor: tokens.borderStrong
        }
      }
    },
    Progress: {
      styles: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.06)'
        },
        section: {
          transition: 'width 180ms ease'
        }
      }
    }
  }
});



