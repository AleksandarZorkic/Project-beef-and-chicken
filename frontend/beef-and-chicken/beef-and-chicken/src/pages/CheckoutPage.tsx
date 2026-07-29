import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import { createOrder, type PaymentMethod } from "../api/orderApi";
import {
  getAllAddresses,
  createAddress,
  type AddressDto,
  type AddressUpsertDto,
} from "../api/addressApi";
import AddressSelector from "../components/address/AddressSelector";
import AddressForm from "../components/address/AddressForm";
import { useAuth } from "../auth/AuthContext";
import {
  getRestaurantSettings,
  type RestaurantSettingsDto,
} from "../api/restaurantSettingsApi";
import { cartSubtotal } from "../state/cart/cart.selectors";

type DeliveryPhoneMode = "Profile" | "Custom";

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();

  const customerId = user?.id;

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
  const [deliveryContactPhoneNumber, setDeliveryContactPhoneNumber] =
    useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");

  const [deliveryPhoneMode, setDeliveryPhoneMode] =
    useState<DeliveryPhoneMode>("Profile");

  const subtotal = cartSubtotal(state);

  const [restaurantSettings, setRestaurantSettings] =
    useState<RestaurantSettingsDto | null>(null);

  const [loadingSettings, setLoadingSettings] = useState(true);

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
      if (!customerId) {
        setLoadingAddresses(false);
        return;
      }

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

  useEffect(() => {
    if (user?.phoneNumber) {
      setDeliveryContactPhoneNumber(user.phoneNumber);
      setDeliveryPhoneMode("Profile");
    } else {
      setDeliveryContactPhoneNumber("");
      setDeliveryPhoneMode("Custom");
    }
  }, [user?.phoneNumber]);

  useEffect(() => {
    async function loadRestaurantSettings() {
      try {
        setLoadingSettings(true);
        setError(null);

        const data = await getRestaurantSettings();

        setRestaurantSettings(data);
      } catch (e: any) {
        setError(
          e?.response?.data?.error ??
            e?.response?.data?.message ??
            e?.response?.data?.title ??
            e?.message ??
            "Greška pri učitavanju podešavanja restorana.",
        );
      } finally {
        setLoadingSettings(false);
      }
    }

    loadRestaurantSettings();
  }, []);

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
      setError(
        e?.response?.data?.error ??
          e?.response?.data?.message ??
          e?.response?.data?.title ??
          e?.message ??
          "Greška pri dodavanju adrese.",
      );
    } finally {
      setSavingAddress(false);
    }
  }

  const deliveryFee =
    restaurantSettings?.freeDeliveryThreshold &&
    subtotal >= restaurantSettings.freeDeliveryThreshold
      ? 0
      : (restaurantSettings?.deliveryFee ?? 0);

  const totalAmount = subtotal + deliveryFee;

  const missingForMinimum =
    restaurantSettings && subtotal < restaurantSettings.minimumOrderAmount
      ? restaurantSettings.minimumOrderAmount - subtotal
      : 0;

  const missingForFreeDelivery =
    restaurantSettings?.freeDeliveryThreshold &&
    subtotal < restaurantSettings.freeDeliveryThreshold
      ? restaurantSettings.freeDeliveryThreshold - subtotal
      : 0;

  async function onSubmit() {
    if (state.items.length === 0) {
      setError("Korpa je prazna.");
      return;
    }

    if (state.items.some((item) => item.quantity <= 0)) {
      setError("Sve stavke u korpi moraju imati količinu veću od 0.");
      return;
    }
    if (!restaurantSettings) {
      setError("Podešavanja restorana nisu učitana. Pokušajte ponovo.");
      return;
    }

    if (!restaurantSettings.isDeliveryEnabled) {
      setError("Dostava trenutno nije dostupna. Pokušajte kasnije.");
      return;
    }

    if (subtotal < restaurantSettings.minimumOrderAmount) {
      setError(
        `Minimalna vrednost porudžbine je ${restaurantSettings.minimumOrderAmount.toLocaleString(
          "sr-RS",
        )} RSD. Dodajte još ${missingForMinimum.toLocaleString(
          "sr-RS",
        )} RSD za poručivanje.`,
      );

      return;
    }

    if (!selectedAddressId) {
      setError("Morate izabrati adresu za dostavu.");
      return;
    }
    const selectedPhoneNumber =
      deliveryPhoneMode === "Profile"
        ? (user?.phoneNumber ?? "")
        : deliveryContactPhoneNumber;

    const trimmedPhoneNumber = selectedPhoneNumber.trim();

    if (!trimmedPhoneNumber) {
      setError("Broj telefona za dostavu je obavezan.");
      return;
    }

    if (trimmedPhoneNumber.length < 6 || trimmedPhoneNumber.length > 20) {
      setError("Broj telefona mora imati između 6 i 20 karaktera.");
      return;
    }

    if (!/^[0-9+\-/() ]+$/.test(trimmedPhoneNumber)) {
      setError(
        "Broj telefona može sadržati samo brojeve, razmake i znakove + - / ( ).",
      );
      return;
    }

    try {
      setSuccessMessage(null);
      setError(null);
      setLoadingOrder(true);

      const payload = {
        customerAddressId: selectedAddressId,
        deliveryContactPhoneNumber: trimmedPhoneNumber,
        paymentMethod,
        notes: state.notes.trim() || undefined,
        items: state.items.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
          selectedOptionIds: i.selectedOptions.map((option) => option.optionId),
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

  if (!user) return <div>Niste prijavljeni.</div>;

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

      <div style={{ marginTop: 16 }}>
        <strong>Kontakt telefon za dostavu:</strong>

        {user.phoneNumber ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <label>
              <input
                type="radio"
                name="deliveryPhoneMode"
                value="Profile"
                checked={deliveryPhoneMode === "Profile"}
                onChange={() => {
                  setDeliveryPhoneMode("Profile");
                  setDeliveryContactPhoneNumber(user.phoneNumber ?? "");
                  setError(null);
                }}
              />{" "}
              Koristi broj sa profila: {user.phoneNumber}
            </label>

            <label>
              <input
                type="radio"
                name="deliveryPhoneMode"
                value="Custom"
                checked={deliveryPhoneMode === "Custom"}
                onChange={() => {
                  setDeliveryPhoneMode("Custom");
                  setDeliveryContactPhoneNumber("");
                  setError(null);
                }}
              />{" "}
              Koristi drugi broj za ovu porudžbinu
            </label>
          </div>
        ) : (
          <div style={{ color: "#555", marginTop: 8 }}>
            Nemaš broj telefona na profilu. Unesi broj za ovu dostavu.
          </div>
        )}

        {deliveryPhoneMode === "Custom" && (
          <label style={{ display: "block", marginTop: 10 }}>
            Broj telefona:
            <input
              type="tel"
              value={deliveryContactPhoneNumber}
              onChange={(e) => setDeliveryContactPhoneNumber(e.target.value)}
              placeholder="0601234567"
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
        )}

        <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
          Kurir koristi ovaj broj ako treba da te pozove pri dostavi.
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Način plaćanja:</strong>

        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="Cash"
              checked={paymentMethod === "Cash"}
              onChange={() => setPaymentMethod("Cash")}
            />{" "}
            Gotovina
          </label>

          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="CardOnDelivery"
              checked={paymentMethod === "CardOnDelivery"}
              onChange={() => setPaymentMethod("CardOnDelivery")}
            />{" "}
            Kartica pri dostavi
          </label>
        </div>
      </div>

      {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}

      <div
        style={{
          marginTop: 20,
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 14,
          background: "white",
          display: "grid",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>Pregled porudžbine</h3>

        {loadingSettings && <div>Učitavam pravila dostave...</div>}

        {!loadingSettings && restaurantSettings && (
          <>
            {!restaurantSettings.isDeliveryEnabled && (
              <div style={{ color: "crimson", fontWeight: 700 }}>
                Dostava trenutno nije dostupna.
              </div>
            )}

            <div>
              Hrana: <strong>{subtotal.toLocaleString("sr-RS")} RSD</strong>
            </div>

            <div>
              Dostava:{" "}
              <strong>
                {deliveryFee === 0
                  ? "Besplatna"
                  : `${deliveryFee.toLocaleString("sr-RS")} RSD`}
              </strong>
            </div>

            <div style={{ fontSize: 13, color: "#555" }}>
              Minimalna porudžbina:{" "}
              {restaurantSettings.minimumOrderAmount.toLocaleString("sr-RS")}{" "}
              RSD
            </div>

            {restaurantSettings.freeDeliveryThreshold && (
              <div style={{ fontSize: 13, color: "#555" }}>
                Besplatna dostava preko:{" "}
                {restaurantSettings.freeDeliveryThreshold.toLocaleString(
                  "sr-RS",
                )}{" "}
                RSD
              </div>
            )}

            {missingForMinimum > 0 && (
              <div style={{ color: "crimson", fontWeight: 700 }}>
                Dodaj još {missingForMinimum.toLocaleString("sr-RS")} RSD za
                poručivanje.
              </div>
            )}

            {missingForMinimum === 0 && missingForFreeDelivery > 0 && (
              <div style={{ color: "#8a5a00" }}>
                Dodaj još {missingForFreeDelivery.toLocaleString("sr-RS")} RSD
                za besplatnu dostavu.
              </div>
            )}

            <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
              Ukupno:{" "}
              <strong style={{ fontSize: 18 }}>
                {totalAmount.toLocaleString("sr-RS")} RSD
              </strong>
            </div>
          </>
        )}
      </div>

      <button
        disabled={
          loadingOrder ||
          loadingAddresses ||
          loadingSettings ||
          !selectedAddressId ||
          !restaurantSettings?.isDeliveryEnabled ||
          missingForMinimum > 0
        }
        style={{ marginTop: 12 }}
        onClick={onSubmit}
      >
        {loadingOrder ? "Kreiram..." : "Poruči"}
      </button>
    </div>
  );
}
