"use client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { BRAND_GREEN, BRAND_GREEN_DARK } from "@/lib/brand";
import CssBaseline from "@mui/material/CssBaseline";
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: BRAND_GREEN,
      dark: BRAND_GREEN_DARK,
      contrastText: "#000000",
    },
    secondary: { main: "#40b7f5" },
    background: { default: "#000000", paper: "#0b100e" },
    text: { primary: "#eff5ec", secondary: "#9da99b" },
  },
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8, padding: "11px 20px" } },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiChip: { styleOverrides: { root: { fontSize: 11, fontWeight: 600 } } },
  },
});
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
