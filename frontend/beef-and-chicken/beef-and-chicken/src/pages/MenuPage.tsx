import { useEffect, useState } from "react";
import { useCart } from "../state/cart/CartContext";
import { getMenu } from "../api/menuApi";
import type { DishMenuDto } from "../api/menuApi";

export default function MenuPage() {
  const { dispatch } = useCart();
  const [data, setData] = useState<DishMenuDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const menu = await getMenu();
        setData(menu);
      } catch (e: any) {
        setError(e?.message ?? "Greška pri učitavanju menija.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Učitavam meni...</div>;
  if (error) return <div style={{ color: "crimson" }}>{error}</div>;

  return (
    <div>
      <h2>Meni</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        {data.map((d) => (
          <div
            key={d.id}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
          >
            <div style={{ fontWeight: 700 }}>{d.name}</div>
            <div>{d.description}</div>
            <div style={{ marginTop: 8 }}>{d.price} RSD</div>
            <button
              style={{ marginTop: 8 }}
              onClick={() =>
                dispatch({
                  type: "ADD-ITEM",
                  payload: { dishId: d.id, name: d.name, unitPrice: d.price },
                })
              }
            >
              Dodaj u korpu
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
