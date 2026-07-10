import React, { useState } from "react";
import { formatPrice } from "../../shared/helpers";
import styles from "../../shared/styles";

function findService(services, zonaKey, ventosas) {
  const durations = [...new Set(services.map((s) => s.duration))].sort((a, b) => a - b);
  if (!durations.length) return null;
  const targetDuration = zonaKey === "medio" ? durations[0] : durations[durations.length - 1];
  const group = services.filter((s) => s.duration === targetDuration).sort((a, b) => a.price - b.price);
  if (!group.length) return null;
  if (group.length === 1) return group[0];
  return ventosas ? group[group.length - 1] : group[0];
}

const zonaCopy = {
  medio: "Con eso alcanza el medio torso. Ahora, ¿querés sumar ventosas para un trabajo más profundo en esa zona?",
  completo: "Para eso, cuerpo completo es lo que más resultado da. ¿Sumamos ventosas para profundizar el efecto?",
};

const quizStyles = {
  question: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, margin: "0 0 14px", color: "#2A2622" },
  opt: {
    display: "block", width: "100%", textAlign: "left", padding: "13px 16px", marginBottom: 8,
    borderRadius: 12, border: "1.5px solid #DCD4C4", background: "#fff", fontSize: 14,
    fontWeight: 600, color: "#2A2622", cursor: "pointer", fontFamily: "'Inter', sans-serif",
  },
  info: { fontSize: 13, color: "#6E6555", lineHeight: 1.5, margin: "0 0 16px" },
  result: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 4px" },
  resultTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: "4px 0 4px", color: "#2A2622" },
  resultPrice: { fontSize: 15, color: "#6E6555", marginBottom: 18 },
  back: {
    display: "block", margin: "16px auto 0", background: "none", border: "none",
    color: "#8A8275", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};

export default function QuizView({ services, onReservar }) {
  const [step, setStep] = useState(0);
  const [zona, setZona] = useState(null);
  const [result, setResult] = useState(null);

  const chooseZona = (z) => {
    setZona(z);
    setStep(1);
  };

  const chooseVentosas = (vent) => {
    const found = findService(services, zona, vent === "si");
    setResult(found);
    setStep(2);
  };

  const reset = () => {
    setStep(0);
    setZona(null);
    setResult(null);
  };

  if (!services.length) return null;

  return (
    <div style={styles.viewWrap}>
      <h2 style={styles.sectionTitle}>¿No sabés qué masaje elegir?</h2>

      {step === 0 && (
        <>
          <p style={quizStyles.question}>¿Qué zona te molesta?</p>
          <button style={quizStyles.opt} onClick={() => chooseZona("medio")}>Cintura, espalda y cuello/hombros</button>
          <button style={quizStyles.opt} onClick={() => chooseZona("medio")}>Piernas</button>
          <button style={quizStyles.opt} onClick={() => chooseZona("completo")}>Todo el cuerpo, o no estoy seguro</button>
        </>
      )}

      {step === 1 && (
        <>
          <p style={quizStyles.question}>{zonaCopy[zona]}</p>
          <p style={quizStyles.info}>
            Las ventosas son copas de succión que se apoyan sobre la piel y generan un vacío suave. Eso descomprime el músculo, mejora la circulación local y ayuda a liberar contracturas más en profundidad que el masaje solo.
          </p>
          <button style={quizStyles.opt} onClick={() => chooseVentosas("si")}>Sí, quiero el trabajo más profundo</button>
          <button style={quizStyles.opt} onClick={() => chooseVentosas("no")}>No, prefiero sin ventosas</button>
        </>
      )}

      {step === 2 && (
        <>
          {result ? (
            <div style={quizStyles.result}>
              <div style={quizStyles.resultTitle}>{result.name}</div>
              <div style={quizStyles.resultPrice}>{formatPrice(result.price)} · {result.duration} min</div>
              <button style={styles.saveBtn} onClick={() => onReservar(result.id)}>Reservar este turno</button>
            </div>
          ) : (
            <p style={quizStyles.question}>No pudimos encontrar un servicio para esta combinación. Probá reservando directamente.</p>
          )}
          <button style={quizStyles.back} onClick={reset}>← Volver a empezar</button>
        </>
      )}
    </div>
  );
}
