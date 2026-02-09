import { useEffect, useMemo, useState } from "react";
import { getMenu, type DishMenuDto } from "../api/menuApi";

type GroupedMenu = Record<string, DishMenuDto[]>;

export default function MenuPage() {
  const [items, setItems] = useState<DishMenuDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getMenu();
        if (!isMounted) return;
        setItems(data);
      } catch (e: any) {
        console.log("AXIOS ERROR:", e);
        console.log("message:", e?.message);
        console.log("status:", e?.response?.status);
        console.log("data:", e?.response?.data);
        setError(e?.message ?? "Greška pri učitavanju menija.");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // grupisanje po CategoryName
  const grouped = useMemo<GroupedMenu>(() => {
    const map: GroupedMenu = {};
    for (const d of items) {
      const key = d.categoryName || "Ostalo";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    return map;
  }, [items]);

  // sortiranje kategorija
  const categoryNames = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      if (a === "Ostalo") return 1;
      if (b === "Ostalo") return -1;

      return a.localeCompare(b);
    });
  }, [grouped]);

  function onDishClick(dish: DishMenuDto) {
    console.log(items.slice(0, 3));
  }

  if (loading) return <div style={{ padding: 16 }}>Učitavanje menija...</div>;

  if (error)
    return (
      <div style={{ padding: 16 }}>
        <p style={{ marginBottom: 12 }}>Greška: {error}</p>
        <button onClick={() => window.location.reload()}>Pokušaj ponovo</button>
      </div>
    );

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>Meni</h1>

      {items.length === 0 ? (
        <p>Nema dostupnih jela.</p>
      ) : (
        categoryNames.map((cat) => (
          <section key={cat} style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>{cat}</h2>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {grouped[cat].map((dish) => (
                <li
                  key={dish.id}
                  onClick={() => onDishClick(dish)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    marginBottom: 8,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{dish.name}</div>
                    <div style={{ opacity: 0.8, fontSize: 14 }}>
                      {dish.description}
                    </div>
                    <div style={{ fontWeight: 600 }}>{dish.price} RSD</div>

                    {dish.allergens?.length ? (
                      <div
                        style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}
                      >
                        Alergeni: {""}
                        {dish.allergens
                          .map((a) =>
                            a.isTrace
                              ? `${a.allergenName} (tragovi)`
                              : a.allergenName
                          )
                          .join(", ")}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
