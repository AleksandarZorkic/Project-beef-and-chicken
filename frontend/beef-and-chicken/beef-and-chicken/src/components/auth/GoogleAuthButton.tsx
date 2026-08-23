import { GoogleLogin } from "@react-oauth/google";

type GoogleAuthButtonProps = {
  disabled?: boolean;
  onSuccess: (idToken: string) => Promise<void> | void;
  onError: () => void;
};

export default function GoogleAuthButton({
  disabled = false,
  onSuccess,
  onError,
}: GoogleAuthButtonProps) {
  if (disabled) {
    return (
      <button
        type="button"
        className="auth-google-button auth-google-button--disabled"
        disabled
      >
        Google prijava je trenutno u toku...
      </button>
    );
  }

  return (
    <div className="auth-google-button">
      <GoogleLogin
        text="continue_with"
        shape="pill"
        size="large"
        width="100%"
        onSuccess={(credentialResponse) => {
          if (!credentialResponse.credential) {
            onError();
            return;
          }

          void onSuccess(credentialResponse.credential);
        }}
        onError={onError}
      />
    </div>
  );
}
