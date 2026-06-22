import { useEffect, useMemo, useState } from "react";
import { getAllergens } from "../api/allergenApi";
import {
  addAllergenToProfile,
  getMyAllergens,
  removeAllergenFromProfile,
} from "../api/userAllergenApi";
import type { Allergen } from "../types/allergen";
import { getApiErrorMessage } from "../utils/apiErrors";

export default function ProfileAllergensPage() {
  const [allAllergens, setAllAllergens] = useState<Allergen[]>([]);
  const [myAllergens, setMyAllergens] = useState<Allergen[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const myAllergenIds = useMemo(() => {
    return new Set(myAllergens.map((allergen) => allergen.id));
  }, [myAllergens]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [allergens, userAllergens] = await Promise.all([
        getAllergens(),
        getMyAllergens(),
      ]);

      setAllAllergens(allergens);
      setMyAllergens(userAllergens);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function toggleAllergen(allergen: Allergen) {
    const isAdded = myAllergenIds.has(allergen.id);

    try {
      setSavingId(allergen.id);
      setError(null);
      setSuccessMessage(null);

      if (isAdded) {
        await removeAllergenFromProfile(allergen.id);

        setMyAllergens((prev) =>
          prev.filter((item) => item.id !== allergen.id),
        );

        setSuccessMessage(`Alergen "${allergen.name}" je uklonjen sa profila.`);
      } else {
        const addedAllergen = await addAllergenToProfile(allergen.id);

        setMyAllergens((prev) => [...prev, addedAllergen]);

        setSuccessMessage(`Alergen "${allergen.name}" je dodat na profil.`);
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div>Učitavam alergene...</div>;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Moji alergeni</h2>

      <p style={{ color: "#555" }}>
        Izaberite alergene na koje ste alergični. Jela koja sadrže ove alergene
        kasnije će biti posebno označena u meniju.
      </p>

      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>
      )}

      {successMessage && (
        <div style={{ color: "green", marginBottom: 12 }}>{successMessage}</div>
      )}

      {allAllergens.length === 0 && (
        <div>Trenutno nema alergena u sistemu.</div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {allAllergens.map((allergen) => {
          const isAdded = myAllergenIds.has(allergen.id);
          const isSaving = savingId === allergen.id;

          return (
            <div
              key={allergen.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: isAdded ? "1px solid #d9534f" : "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                background: isAdded ? "#fff2f2" : "white",
              }}
            >
              <div>
                <strong>{allergen.name}</strong>

                {isAdded && (
                  <div style={{ color: "#d9534f", fontSize: 13 }}>
                    Dodato na profil
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => toggleAllergen(allergen)}
              >
                {isSaving ? "Čuvam..." : isAdded ? "Ukloni" : "Dodaj"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
