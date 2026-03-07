import { Link, useParams } from "react-router-dom";

export default function OrderSuccessPage() {
  const { orderId } = useParams();
  return (
    <div>
      <h2>Uspešno!</h2>
      <p>Porudžbina #{orderId} je kreirana.</p>
      <Link to="/menu">Nazad na meni</Link>
    </div>
  );
}
