import { Link, useParams } from "react-router-dom";

export default function OrderSuccessPage() {
  const { orderId } = useParams();

  return (
    <div>
      <h2>Porudžbina je uspešno kreirana!</h2>

      <p>
        Broj porudžbine: <strong>#{orderId}</strong>
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/menu">Nazad na meni</Link>
        <Link to="/my-orders">Prikaži moje porudžbine</Link>
      </div>
    </div>
  );
}
