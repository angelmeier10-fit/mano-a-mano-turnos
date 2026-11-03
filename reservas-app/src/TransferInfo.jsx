import React from "react";
import { formatPrice } from "../../shared/helpers";

// Datos de transferencia del negocio (se cargan en la agenda, en Negocio). Sin alias, se coordina por WhatsApp.
export default function TransferInfo({ businessInfo, amount }) {
  const holder = businessInfo?.transferHolder?.trim();
  const alias = businessInfo?.transferAlias?.trim();
  return (
    <div style={{ background: "#F0F7EC", border: "1.5px solid #6E7F5C", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: "#3D5430", marginBottom: 8 }}>{alias ? "Datos para transferir" : "Pago"}</div>
      <div style={{ fontSize: 13.5, color: "#2A2622", lineHeight: 1.9 }}>
        {alias ? (
          <>
            {holder && <div><strong>{holder}</strong></div>}
            <div>Alias / CVU: <strong>{alias}</strong></div>
          </>
        ) : (
          <div>Coordiná el pago por WhatsApp{businessInfo?.whatsapp ? ` al ${businessInfo.whatsapp}` : ""}.</div>
        )}
        <div style={{ marginTop: 4, fontWeight: 700, fontSize: 15, color: "#3D5430" }}>{formatPrice(amount)}</div>
      </div>
    </div>
  );
}
