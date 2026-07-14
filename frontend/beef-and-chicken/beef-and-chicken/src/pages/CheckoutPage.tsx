import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import { createOrder } from "../api/orderApi";
import {
  getAllAddresses,
  createAddress,
  type AddressDto,
  type AddressUpsertDto,
} from "../api/addressApi";
import AddressSelector from "../components/address/AddressSelector";
import AddressForm from "../components/address/AddressForm";
import { useAuth } from "../auth/AuthContext";

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return <div>Niste prijavljeni.</div>;

  const customerId = user.id;

  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );

  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  const [newAddress, setNewAddress] = useState<AddressUpsertDto>({
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    label: "",
    note: "",
    isDefault: false,
  });

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    async function loadAddresses() {
      try {
        setError(null);
        setLoadingAddresses(true);

        const data = await getAllAddresses();
        setAddresses(data);

        const defaultAddress = data.find((a) => a.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        } else if (data.length > 0) {
          setSelectedAddressId(data[0].id);
        } else {
          setSelectedAddressId(null);
        }
      } catch (e: any) {
        setError(e?.message ?? "Greška pri učitavanju adresa.");
      } finally {
        setLoadingAddresses(false);
      }
    }

    loadAddresses();
  }, [customerId]);

  async function onCreateAddress() {
    if (!newAddress.street.trim()) {
      setError("Ulica je obavezna.");
      return;
    }

    if (!newAddress.houseNumber.trim()) {
      setError("Broj je obavezan.");
      return;
    }

    if (!newAddress.city.trim()) {
      setError("Grad je obavezan.");
      return;
    }

    try {
      setSuccessMessage(null);
      setError(null);
      setSavingAddress(true);

      const created = await createAddress({
        ...newAddress,
        street: newAddress.street.trim(),
        houseNumber: newAddress.houseNumber.trim(),
        city: newAddress.city.trim(),
        postalCode: newAddress.postalCode?.trim() || null,
        label: newAddress.label?.trim() || null,
        note: newAddress.note?.trim() || null,
      });

      setAddresses((prev) => {
        if (created.isDefault) {
          return prev.map((a) => ({ ...a, isDefault: false })).concat(created);
        }
        return [...prev, created];
      });

      setSelectedAddressId(created.id);
      setShowNewAddressForm(false);
      setSuccessMessage("Adresa je uspešno dodata.");

      setNewAddress({
        street: "",
        houseNumber: "",
        postalCode: "",
        city: "",
        label: "",
        note: "",
        isDefault: false,
      });
    } catch (e: any) {
      console.log("CREATE ADDRESS STATUS:", e?.response?.status);
      console.log("CREATE ADDRESS DATA:", e?.response?.data);
      setError(
        e?.response?.data?.message ??
          e?.response?.data?.title ??
          e?.message ??
          "Greška pri dodavanju adrese.",
      );
    } finally {
      setSavingAddress(false);
    }
  }

  async function onSubmit() {
    if (state.items.length === 0) {
      setError("Korpa je prazna.");
      return;
    }

    if (state.items.some((item) => item.quantity <= 0)) {
      setError("Sve stavke u korpi moraju imati količinu veću od 0.");
      return;
    }

    if (!selectedAddressId) {
      setError("Morate izabrati adresu za dostavu.");
      return;
    }

    try {
      setSuccessMessage(null);
      setError(null);
      setLoadingOrder(true);

      const payload = {
        customerAddressId: selectedAddressId,
        notes: state.notes.trim() || undefined,
        items: state.items.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
        })),
      };

      const created = await createOrder(payload);

      dispatch({ type: "CLEAR" });
      navigate(`/success/${created.id}`);
    } catch (e: any) {
      setError(
        e?.response?.data?.error ??
          e?.response?.data?.message ??
          e?.response?.data?.title ??
          e?.message ??
          "Greška pri kreiranju porudžbine.",
      );
    } finally {
      setLoadingOrder(false);
    }
  }
  if (state.items.length === 0) return <div>Korpa je prazna</div>;

  return (
    <div>
      <h2>Checkout</h2>

      <h3>Izaberi adresu dostave</h3>

      {loadingAddresses && <div>Učitavam adrese...</div>}

      {!loadingAddresses && addresses.length === 0 && (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          Nemaš nijednu sačuvanu adresu. Prvo dodaj adresu.
        </div>
      )}

      {!loadingAddresses && addresses.length > 0 && (
        <AddressSelector
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelect={setSelectedAddressId}
        />
      )}

      <button
        type="button"
        style={{ marginTop: 16 }}
        onClick={() => setShowNewAddressForm((prev) => !prev)}
      >
        {showNewAddressForm ? "Zatvori formu" : "Dodaj novu adresu"}
      </button>

      {showNewAddressForm && (
        <AddressForm
          value={newAddress}
          onChange={setNewAddress}
          onSubmit={onCreateAddress}
          saving={savingAddress}
        />
      )}

      {successMessage && (
        <div
          style={{
            color: "green",
            marginTop: 12,
            padding: 10,
            border: "1px solid green",
            borderRadius: 8,
            background: "#f0fff0",
          }}
        >
          {successMessage}
        </div>
      )}

      {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}

      <button
        disabled={loadingOrder || loadingAddresses || !selectedAddressId}
        style={{ marginTop: 12 }}
        onClick={onSubmit}
      >
        {loadingOrder ? "Kreiram..." : "Poruči"}
      </button>
    </div>
  );
}
