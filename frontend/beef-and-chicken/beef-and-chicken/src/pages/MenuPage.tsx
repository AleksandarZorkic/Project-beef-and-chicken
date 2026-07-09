import { useEffect, useState, useMemo } from "react";
import { useCart } from "../state/cart/CartContext";
import { getMenu } from "../api/menuApi";
import type { DishMenuDto } from "../api/menuApi";
import { API_ORIGIN } from "../api/https";
import { getMyAllergens } from "../api/userAllergenApi";
import type { Allergen } from "../types/allergen";

function resolveImageUrl(imageUrl?: string) {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

export default function MenuPage() {
  const { dispatch } = useCart();
  const [data, setData] = useState<DishMenuDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myAllergens, setMyAllergens] = useState<Allergen[]>([]);

  useEffect(() => {
    async function loadMenuData() {
      try {
        setLoading(true);
        setError(null);

        const menu = await getMenu();
        setData(menu);

        try {
          const userAllergens = await getMyAllergens();
          setMyAllergens(userAllergens);
        } catch {
          setMyAllergens([]);
        }
      } catch (e: any) {
        setError(
          e?.message || "Došlo je do greške prilikom učitavanja menija.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadMenuData();
  }, []);

  const myAllergenId = useMemo(() => {
    return new Set(myAllergens.map((allergen) => allergen.id));
  }, [myAllergens]);

  function getMatchingAllergens(dish: DishMenuDto) {
    return dish.allergens.filter((allergen) =>
      myAllergenId.has(allergen.allergenId),
    );
  }

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
        {data.map((d) => {
          const matchingAllergens = getMatchingAllergens(d);
          const directAllergens = matchingAllergens.filter((a) => !a.isTrace);
          const traceAllergens = matchingAllergens.filter((a) => a.isTrace);
          const hasAllergyWarning = matchingAllergens.length > 0;

          return (
            <div
              key={d.id}
              style={{
                border: hasAllergyWarning
                  ? "2px solid #d9534f"
                  : "1px solid #ddd",
                background: hasAllergyWarning ? "#fff2f2" : "white",
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <h3>{d.name}</h3>

              <p>{d.description}</p>

              <strong>{d.price} RSD</strong>

              {hasAllergyWarning && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 6,
                    background: "#ffe1e1",
                    color: "#9f1d1d",
                    fontWeight: 600,
                  }}
                >
                  ⚠ Ovo jelo sadrži alergene koje ste označili na profilu.
                  {directAllergens.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      Sadrži:{" "}
                      {directAllergens
                        .map((allergen) => allergen.allergenName)
                        .join(", ")}
                    </div>
                  )}
                  {traceAllergens.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      Može sadržati tragove:{" "}
                      {traceAllergens
                        .map((allergen) => allergen.allergenName)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}

              {d.allergens.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong>Alergeni: </strong>

                  {d.allergens.map((allergen) => (
                    <span
                      key={allergen.allergenId}
                      style={{
                        display: "inline-block",
                        border: "1px solid #ddd",
                        borderRadius: 999,
                        padding: "2px 8px",
                        marginRight: 6,
                        marginTop: 4,
                        fontSize: 13,
                      }}
                    >
                      {allergen.allergenName}
                      {allergen.isTrace ? " — tragovi" : ""}
                    </span>
                  ))}
                </div>
              )}

              <button
                style={{ marginTop: 8 }}
                onClick={() =>
                  dispatch({
                    type: "ADD-ITEM",
                    payload: {
                      dishId: d.id,
                      name: d.name,
                      unitPrice: d.price,
                    },
                  })
                }
              >
                Dodaj u korpu
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
