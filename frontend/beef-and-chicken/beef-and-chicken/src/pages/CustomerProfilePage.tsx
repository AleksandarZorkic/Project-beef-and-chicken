import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { updatePhoneNumber } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";

function validatePhoneNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim();

  if (!trimmed) {
    return "Broj telefona je obavezan.";
  }

  if (trimmed.length < 6 || trimmed.length > 20) {
    return "Broj telefona mora imati između 6 i 20 karaktera.";
  }

  if (!/^[0-9+\-/() ]+$/.test(trimmed)) {
    return "Broj telefona može sadržati samo brojeve, razmake i znakove + - / ( ).";
  }

  return null;
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "BC";
}

function formatRoles(roles: string[]) {
  if (roles.length === 0) return "Nema role";

  return roles.join(", ");
}

export default function CustomerProfilePage() {
  const { user, setUserProfile, refreshProfile } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setPhoneNumber(user?.phoneNumber ?? "");
  }, [user?.phoneNumber]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  async function onRefreshProfile() {
    try {
      setRefreshingProfile(true);
      setError(null);
      setSuccessMessage(null);

      await refreshProfile();

      setSuccessMessage("Profil je osvežen.");
    } catch (e: any) {
      setError(
        e?.response?.data?.error ??
          e?.response?.data?.message ??
          e?.response?.data?.title ??
          e?.message ??
          "Greška pri osvežavanju profila.",
      );
    } finally {
      setRefreshingProfile(false);
    }
  }

  async function onSavePhoneNumber() {
    const validationError = validatePhoneNumber(phoneNumber);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (phoneNumber.trim() === (user?.phoneNumber ?? "").trim()) {
      setEditingPhone(false);
      setError(null);
      setSuccessMessage(null);
      return;
    }

    try {
      setSavingPhone(true);
      setError(null);
      setSuccessMessage(null);

      const updatedProfile = await updatePhoneNumber({
        phoneNumber: phoneNumber.trim(),
      });

      setUserProfile(updatedProfile);
      setEditingPhone(false);
      setSuccessMessage("Broj telefona je uspešno promenjen.");
    } catch (e: any) {
      setError(
        e?.response?.data?.error ??
          e?.response?.data?.message ??
          e?.response?.data?.title ??
          e?.message ??
          "Greška pri promeni broja telefona.",
      );
    } finally {
      setSavingPhone(false);
    }
  }

  function cancelPhoneEdit() {
    setEditingPhone(false);
    setPhoneNumber(user?.phoneNumber ?? "");
    setError(null);
    setSuccessMessage(null);
  }

  if (!user) {
    return <div>Niste prijavljeni.</div>;
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={{ marginBottom: 6 }}>Moj profil</h2>

          <p style={{ margin: 0, color: "#555" }}>
            Ovde možeš da vidiš podatke svog naloga i izmeniš broj telefona za
            dostavu.
          </p>
        </div>

        <button
          type="button"
          disabled={refreshingProfile}
          onClick={onRefreshProfile}
        >
          {refreshingProfile ? "Osvežavam..." : "Osveži profil"}
        </button>
      </div>

      {error && (
        <div
          style={{
            color: "crimson",
            marginBottom: 12,
            border: "1px solid #ffb3b3",
            background: "#fff2f2",
            borderRadius: 8,
            padding: 10,
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            color: "green",
            marginBottom: 12,
            border: "1px solid #9fd49f",
            background: "#f0fff0",
            borderRadius: 8,
            padding: 10,
          }}
        >
          {successMessage}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          gap: 16,
        }}
      >
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 18,
            background: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "#111827",
                color: "white",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              {getInitials(user.firstName, user.lastName)}
            </div>

            <div>
              <h3 style={{ margin: 0 }}>
                {user.firstName} {user.lastName}
              </h3>

              <div style={{ color: "#666", marginTop: 4 }}>{user.email}</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <strong>Ime:</strong> {user.firstName}
            </div>

            <div>
              <strong>Prezime:</strong> {user.lastName}
            </div>

            <div>
              <strong>Email:</strong> {user.email}
            </div>

            <div>
              <strong>Korisničko ime:</strong> {user.userName}
            </div>

            <div>
              <strong>Role:</strong> {formatRoles(user.roles)}
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 18,
            background: "white",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Telefon za dostavu</h3>

          <p style={{ color: "#555", marginTop: 0 }}>
            Ovaj broj se koristi na checkout-u kao podrazumevani kontakt broj za
            kurira.
          </p>

          {!editingPhone ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <strong>Trenutni broj:</strong>{" "}
                {user.phoneNumber ? (
                  <span>{user.phoneNumber}</span>
                ) : (
                  <span style={{ color: "crimson" }}>Nije unet</span>
                )}
              </div>

              <button type="button" onClick={() => setEditingPhone(true)}>
                {user.phoneNumber ? "Promeni broj telefona" : "Dodaj broj"}
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <label>
                Novi broj telefona
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  placeholder="0601234567"
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: 8,
                  }}
                />
              </label>

              <div style={{ fontSize: 13, color: "#666" }}>
                Dozvoljeni znakovi: brojevi, razmak i + - / ( ).
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={savingPhone}
                  onClick={onSavePhoneNumber}
                >
                  {savingPhone ? "Čuvam..." : "Sačuvaj broj"}
                </button>

                <button
                  type="button"
                  disabled={savingPhone}
                  onClick={cancelPhoneEdit}
                >
                  Otkaži
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <section
        style={{
          marginTop: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 18,
          background: "white",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Brze opcije</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <Link
            to="/addresses"
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              textDecoration: "none",
              color: "inherit",
              display: "grid",
              gap: 4,
            }}
          >
            <strong>Moje adrese</strong>
            <span style={{ color: "#666", fontSize: 13 }}>
              Dodaj ili izmeni adresu za dostavu.
            </span>
          </Link>

          <Link
            to="/my-allergens"
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              textDecoration: "none",
              color: "inherit",
              display: "grid",
              gap: 4,
            }}
          >
            <strong>Moji alergeni</strong>
            <span style={{ color: "#666", fontSize: 13 }}>
              Označi alergene za upozorenja u meniju.
            </span>
          </Link>

          <Link
            to="/my-orders"
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              textDecoration: "none",
              color: "inherit",
              display: "grid",
              gap: 4,
            }}
          >
            <strong>Moje porudžbine</strong>
            <span style={{ color: "#667", fontSize: 13 }}>
              Pogledaj status i istoriju porudžbina.
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
