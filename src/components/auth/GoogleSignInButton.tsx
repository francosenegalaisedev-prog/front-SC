   import { useEffect, useRef } from "react";

    declare global {
      interface Window {
        google?: {
          accounts?: {
            id?: {
              initialize: (opts: {
                client_id: string;
                callback: (res: { credential?: string }) => void;
              }) => void;
              renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
            };
          };
        };
      }
    }

    const GSI_SCRIPT_ID = "google-gsi-client";

    export default function GoogleSignInButton({
      onCredential,
      text = "continue_with",
    }: {
      onCredential: (credential: string) => void;
      text?: "signin_with" | "signup_with" | "continue_with";
    }) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
      const containerRef = useRef<HTMLDivElement>(null);
      const callbackRef = useRef(onCredential);
      callbackRef.current = onCredential;

      useEffect(() => {
        if (!clientId || !containerRef.current) return;

        const init = () => {
          const idApi = window.google?.accounts?.id;
          if (!idApi || !containerRef.current) return;
          containerRef.current.innerHTML = "";
          idApi.initialize({
            client_id: clientId,
            callback: res => {
              if (res.credential) callbackRef.current(res.credential);
            },
          });
          idApi.renderButton(containerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text,
            shape: "rectangular",
            width: 320,
            locale: "fr",
          });
        };

        if (window.google?.accounts?.id) {
          init();
          return;
        }

        let script = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement |
        null;
        if (!script) {
          script = document.createElement("script");
          script.id = GSI_SCRIPT_ID;
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }
        script.addEventListener("load", init);
        return () => script?.removeEventListener("load", init);
      }, [clientId, text]);

      if (!clientId) return null;

      return (
        <div style={{ display: "grid", gap: "0.75rem", justifyItems: "center" }}>
          <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>ou</div>
          <div ref={containerRef} />
        </div>
      );
    }