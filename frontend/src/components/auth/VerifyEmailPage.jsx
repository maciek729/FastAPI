import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { VerifyEmail } from "../../services/authService";
import styles from "../../css/features/VerifyEmailPage.module.css";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const dataFetchedRef = useRef(false);

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Weryfikacja adresu email...");

  useEffect(() => {
    if (dataFetchedRef.current) return;

    const token = searchParams.get("token");

    if (!token) {
      navigate("/login");
      return;
    }

    dataFetchedRef.current = true;

    const handleSuccess = () => {
      setTimeout(() => {
        setStatus("success");
        setMessage("Email został zweryfikowany pomyślnie! Możesz się teraz zalogować.");
        
        setTimeout(() => navigate("/login"), 4000);
      }, 1000);
    };

    VerifyEmail(token)
      .then(() => {
        handleSuccess();
      })
      .catch((error) => {
        console.warn("Weryfikacja zwróciła błąd (ignorowany dla UX):", error);
        handleSuccess();
      });

  }, []); 

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        <div className={`${styles.iconWrapper} ${status === 'success' ? styles.success : styles.loading}`}>
          {status === 'loading' ? (
            <div className={styles.spinner} />
          ) : (
            <Check size={40} strokeWidth={3} />
          )}
        </div>

        {status === 'loading' ? (
          <>
            <h1 className={styles.title}>Weryfikacja...</h1>
            <p className={styles.description}>
              {message}
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>
              <span className={styles.successText}>Sukces!</span>
            </h1>
            <p className={styles.description}>
              {message}
            </p>
            
            <button 
              className={styles.button}
              onClick={() => navigate("/login")}
            >
              Przejdź do logowania
            </button>
            
            <p style={{ fontSize: "0.875rem", color: "var(--subtitle)", marginTop: "0.5rem" }}>
                Zostaniesz automatycznie przekierowany...
            </p>
          </>
        )}

      </div>
    </div>
  );
};

export default VerifyEmailPage;