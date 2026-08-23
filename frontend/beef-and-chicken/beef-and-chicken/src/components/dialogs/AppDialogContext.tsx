import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "../../styles/AppDialog.scss";

type DialogTone = "default" | "success" | "warning" | "danger";

type BaseDialogOptions = {
  title: string;
  message: ReactNode;
  confirmText?: string;
  tone?: DialogTone;
};

type ConfirmDialogOptions = BaseDialogOptions & {
  cancelText?: string;
};

type DialogState = {
  type: "alert" | "confirm";
  title: string;
  message: ReactNode;
  confirmText: string;
  cancelText?: string;
  tone: DialogTone;
};

type AppDialogContextValue = {
  alert: (options: BaseDialogOptions) => Promise<void>;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

function getToneIcon(tone: DialogTone) {
  switch (tone) {
    case "success":
      return "✓";
    case "warning":
      return "!";
    case "danger":
      return "!";
    default:
      return "?";
  }
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;

      setDialog({
        type: "confirm",
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? "Potvrdi",
        cancelText: options.cancelText ?? "Odustani",
        tone: options.tone ?? "default",
      });
    });
  }, []);

  const alert = useCallback(
    async (options: BaseDialogOptions) => {
      await confirm({
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? "U redu",
        tone: options.tone ?? "default",
      });
    },
    [confirm],
  );

  useEffect(() => {
    if (!dialog) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDialog(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, closeDialog]);

  return (
    <AppDialogContext.Provider value={{ alert, confirm }}>
      {children}

      {dialog && (
        <div className="app-dialog" role="presentation">
          <button
            type="button"
            className="app-dialog__backdrop"
            aria-label="Zatvori dijalog"
            onClick={() => closeDialog(false)}
          />

          <section
            className={[
              "app-dialog__panel",
              `app-dialog__panel--${dialog.tone}`,
            ].join(" ")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
          >
            <div className="app-dialog__icon" aria-hidden="true">
              {getToneIcon(dialog.tone)}
            </div>

            <div className="app-dialog__content">
              <h2 id="app-dialog-title">{dialog.title}</h2>

              <div className="app-dialog__message">{dialog.message}</div>
            </div>

            <footer className="app-dialog__actions">
              {dialog.type === "confirm" && (
                <button
                  type="button"
                  className="app-dialog__button app-dialog__button--secondary"
                  onClick={() => closeDialog(false)}
                >
                  {dialog.cancelText}
                </button>
              )}

              <button
                type="button"
                className="app-dialog__button app-dialog__button--primary"
                onClick={() => closeDialog(true)}
                autoFocus
              >
                {dialog.confirmText}
              </button>
            </footer>
          </section>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);

  if (!context) {
    throw new Error(
      "useAppDialog mora biti korišćen unutar AppDialogProvider.",
    );
  }

  return context;
}
