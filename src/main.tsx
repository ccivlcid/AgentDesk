import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./ThemeContext";
import { ToastProvider } from "./components/ui/Toast";
import { ConfirmDialogProvider } from "./components/ui/ConfirmDialog";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
