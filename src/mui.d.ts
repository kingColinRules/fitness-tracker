declare module '@mui/material/styles' {
  interface Palette {
    heatmap: string[];
    chartColors: string[];
  }
  interface PaletteOptions {
    heatmap?: string[];
    chartColors?: string[];
  }
  interface TypographyPropsVariantOverrides {
    labelMicro: true;
    labelXs: true;
    labelSm: true;
    labelLg: true;
    iconMd: true;
    iconLg: true;
  }
  interface TypographyVariants {
    labelMicro: React.CSSProperties;
    labelXs: React.CSSProperties;
    labelSm: React.CSSProperties;
    labelLg: React.CSSProperties;
    iconMd: React.CSSProperties;
    iconLg: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    labelMicro?: React.CSSProperties;
    labelXs?: React.CSSProperties;
    labelSm?: React.CSSProperties;
    labelLg?: React.CSSProperties;
    iconMd?: React.CSSProperties;
    iconLg?: React.CSSProperties;
  }
}
