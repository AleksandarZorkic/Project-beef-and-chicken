import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import {
  createOrder,
  type FulfillmentType,
  type PaymentMethod,
} from "../api/orderApi";
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
import "../styles/CheckoutPage.scss";

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

  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>("Delivery");

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

  const isDelivery = fulfillmentType === "Delivery";
  const isPickup = fulfillmentType === "Pickup";

  const deliveryFee = isPickup
    ? 0
    : restaurantSettings?.freeDeliveryThreshold &&
        subtotal >= restaurantSettings.freeDeliveryThreshold
      ? 0
      : (restaurantSettings?.deliveryFee ?? 0);

  const totalAmount = subtotal + deliveryFee;

  const missingForMinimum =
    isDelivery &&
    restaurantSettings &&
    subtotal < restaurantSettings.minimumOrderAmount
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

    if (isDelivery && !restaurantSettings.isDeliveryEnabled) {
      setError(
        "Dostava trenutno nije dostupna. Možete izabrati lično preuzimanje.",
      );
      return;
    }

    if (isDelivery && subtotal < restaurantSettings.minimumOrderAmount) {
      setError(
        `Minimalna vrednost porudžbine za dostavu je ${restaurantSettings.minimumOrderAmount.toLocaleString(
          "sr-RS",
        )} RSD. Dodajte još ${missingForMinimum.toLocaleString(
          "sr-RS",
        )} RSD za poručivanje.`,
      );

      return;
    }

    if (isDelivery && !selectedAddressId) {
      setError("Morate izabrati adresu za dostavu.");
      return;
    }

    const selectedPhoneNumber =
      deliveryPhoneMode === "Profile"
        ? (user?.phoneNumber ?? "")
        : deliveryContactPhoneNumber;

    const trimmedPhoneNumber = selectedPhoneNumber.trim();

    if (!trimmedPhoneNumber) {
      setError("Broj telefona je obavezan.");
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
        customerAddressId: isDelivery ? selectedAddressId : null,
        deliveryContactPhoneNumber: trimmedPhoneNumber,
        paymentMethod,
        fulfillmentType,
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

  if (!user) {
    return (
      <main className="checkout-state">
        <div className="checkout-state__card">
          <span className="checkout-state__eyebrow">PRIJAVA JE POTREBNA</span>

          <h1 className="checkout-state__title">Niste prijavljeni</h1>

          <p className="checkout-state__text">
            Prijavite se kako biste nastavili sa kreiranjem porudžbine.
          </p>
        </div>
      </main>
    );
  }

  if (state.items.length === 0) {
    return (
      <main className="checkout-state">
        <div className="checkout-state__card">
          <div className="checkout-state__logo-shell" aria-hidden="true">
            <img src="/logo.png" alt="" className="checkout-state__logo" />
          </div>

          <span className="checkout-state__eyebrow">NEMA STAVKI</span>

          <h1 className="checkout-state__title">Korpa je prazna</h1>

          <p className="checkout-state__text">
            Dodajte jela u korpu pre nego što nastavite sa poručivanjem.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-page__header">
        <div className="checkout-page__heading">
          <span className="checkout-page__eyebrow">ZAVRŠETAK PORUDŽBINE</span>

          <h1 className="checkout-page__title">Checkout</h1>

          <p className="checkout-page__description">
            Izaberite adresu, proverite kontakt podatke i odaberite način
            plaćanja.
          </p>
        </div>

        <div className="checkout-steps" aria-label="Koraci poručivanja">
          <div className="checkout-steps__item">
            <span className="checkout-steps__number">1</span>

            <span className="checkout-steps__label">Preuzimanje</span>
          </div>

          <span className="checkout-steps__divider" aria-hidden="true" />

          {isDelivery && (
            <>
              <div className="checkout-steps__item">
                <span className="checkout-steps__number">2</span>

                <span className="checkout-steps__label">Adresa</span>
              </div>

              <span className="checkout-steps__divider" aria-hidden="true" />
            </>
          )}

          <div className="checkout-steps__item">
            <span className="checkout-steps__number">
              {isDelivery ? "3" : "2"}
            </span>

            <span className="checkout-steps__label">Kontakt</span>
          </div>

          <span className="checkout-steps__divider" aria-hidden="true" />

          <div className="checkout-steps__item">
            <span className="checkout-steps__number">
              {isDelivery ? "4" : "3"}
            </span>

            <span className="checkout-steps__label">Plaćanje</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="checkout-alert checkout-alert--error" role="alert">
          <span className="checkout-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Proverite podatke</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          className="checkout-alert checkout-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="checkout-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Uspešno</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <div className="checkout-layout">
        <div className="checkout-form-column">
          <section
            className="checkout-card"
            aria-labelledby="checkout-fulfillment-title"
          >
            <header className="checkout-card__header">
              <span className="checkout-card__number" aria-hidden="true">
                1
              </span>

              <div>
                <span className="checkout-card__eyebrow">
                  NAČIN PREUZIMANJA
                </span>

                <h2
                  id="checkout-fulfillment-title"
                  className="checkout-card__title"
                >
                  Kako želite da preuzmete porudžbinu?
                </h2>

                <p className="checkout-card__description">
                  Izaberite dostavu na adresu ili lično preuzimanje u restoranu.
                </p>
              </div>
            </header>

            <div className="checkout-choice-group checkout-choice-group--payment">
              <label className="checkout-choice">
                <input
                  type="radio"
                  name="fulfillmentType"
                  value="Delivery"
                  checked={fulfillmentType === "Delivery"}
                  onChange={() => {
                    setFulfillmentType("Delivery");
                    setError(null);
                  }}
                />

                <span className="checkout-choice__control">
                  <span className="checkout-choice__radio" />

                  <span
                    className="checkout-choice__payment-icon"
                    aria-hidden="true"
                  ></span>

                  <span className="checkout-choice__content">
                    <span>{isPickup ? "Preuzimanje" : "Dostava"}</span>

                    <small>Porudžbina stiže na izabranu adresu</small>
                  </span>
                </span>
              </label>

              <label className="checkout-choice">
                <input
                  type="radio"
                  name="fulfillmentType"
                  value="Pickup"
                  checked={fulfillmentType === "Pickup"}
                  onChange={() => {
                    setFulfillmentType("Pickup");
                    setError(null);
                  }}
                />

                <span className="checkout-choice__control">
                  <span className="checkout-choice__radio" />

                  <span
                    className="checkout-choice__payment-icon"
                    aria-hidden="true"
                  ></span>

                  <span className="checkout-choice__content">
                    <strong>Lično preuzimanje</strong>

                    <small>Preuzimate porudžbinu direktno u restoranu</small>
                  </span>
                </span>
              </label>
            </div>
          </section>

          {isDelivery && (
            <section
              className="checkout-card"
              aria-labelledby="checkout-address-title"
            >
              <header className="checkout-card__header">
                <span className="checkout-card__number" aria-hidden="true">
                  1
                </span>

                <div>
                  <span className="checkout-card__eyebrow">MESTO DOSTAVE</span>

                  <h2
                    id="checkout-address-title"
                    className="checkout-card__title"
                  >
                    Izaberite adresu
                  </h2>

                  <p className="checkout-card__description">
                    Porudžbina će biti dostavljena na izabranu adresu.
                  </p>
                </div>
              </header>

              {loadingAddresses && (
                <div
                  className="checkout-loading"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="checkout-loading__spinner"
                    aria-hidden="true"
                  />

                  <span>Učitavamo sačuvane adrese...</span>
                </div>
              )}

              {!loadingAddresses && addresses.length === 0 && (
                <div className="checkout-address-warning">
                  <span
                    className="checkout-address-warning__icon"
                    aria-hidden="true"
                  >
                    !
                  </span>

                  <div>
                    <strong>Nema sačuvanih adresa</strong>

                    <p>Dodajte adresu pre nastavka porudžbine.</p>
                  </div>
                </div>
              )}

              {!loadingAddresses && addresses.length > 0 && (
                <div className="checkout-address-selector">
                  <AddressSelector
                    addresses={addresses}
                    selectedAddressId={selectedAddressId}
                    onSelect={setSelectedAddressId}
                  />
                </div>
              )}

              <button
                type="button"
                className={[
                  "checkout-address-toggle",
                  showNewAddressForm ? "checkout-address-toggle--open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setShowNewAddressForm((prev) => !prev)}
              >
                <span
                  className="checkout-address-toggle__icon"
                  aria-hidden="true"
                >
                  {showNewAddressForm ? "−" : "+"}
                </span>

                <span>
                  {showNewAddressForm ? "Zatvori formu" : "Dodaj novu adresu"}
                </span>
              </button>

              {showNewAddressForm && (
                <div className="checkout-address-form">
                  <AddressForm
                    value={newAddress}
                    onChange={setNewAddress}
                    onSubmit={onCreateAddress}
                    saving={savingAddress}
                  />
                </div>
              )}
            </section>
          )}

          <section
            className="checkout-card"
            aria-labelledby="checkout-phone-title"
          >
            <header className="checkout-card__header">
              <span className="checkout-card__number" aria-hidden="true">
                2
              </span>

              <div>
                <span className="checkout-card__eyebrow">KONTAKT TELEFON</span>

                <h2 id="checkout-phone-title" className="checkout-card__title">
                  Broj telefona
                </h2>

                <p className="checkout-card__description">
                  Restoran može koristiti ovaj broj ako je potrebna potvrda
                  porudžbine.
                </p>
              </div>
            </header>

            {user.phoneNumber ? (
              <div className="checkout-choice-group">
                <label className="checkout-choice">
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
                  />

                  <span className="checkout-choice__control">
                    <span className="checkout-choice__radio" />

                    <span className="checkout-choice__content">
                      <strong>Koristi broj sa profila</strong>

                      <small>{user.phoneNumber}</small>
                    </span>
                  </span>
                </label>

                <label className="checkout-choice">
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
                  />

                  <span className="checkout-choice__control">
                    <span className="checkout-choice__radio" />

                    <span className="checkout-choice__content">
                      <strong>Koristi drugi broj</strong>

                      <small>Samo za ovu porudžbinu</small>
                    </span>
                  </span>
                </label>
              </div>
            ) : (
              <div className="checkout-phone-notice">
                <span
                  className="checkout-phone-notice__icon"
                  aria-hidden="true"
                >
                  i
                </span>

                <p>
                  Nemate broj telefona na profilu. Unesite broj koji restoran
                  može koristiti za ovu porudžbinu.
                </p>
              </div>
            )}

            {deliveryPhoneMode === "Custom" && (
              <div className="checkout-field">
                <label
                  className="checkout-field__label"
                  htmlFor="delivery-phone"
                >
                  Broj telefona
                </label>

                <div className="checkout-field__input-wrapper">
                  <span className="checkout-field__prefix" aria-hidden="true">
                    ☎
                  </span>

                  <input
                    id="delivery-phone"
                    className="checkout-field__input"
                    type="tel"
                    value={deliveryContactPhoneNumber}
                    onChange={(e) =>
                      setDeliveryContactPhoneNumber(e.target.value)
                    }
                    placeholder="060 123 4567"
                  />
                </div>
              </div>
            )}

            <p className="checkout-card__hint">
              Broj se koristi isključivo u vezi sa ovom porudžbinom.
            </p>
          </section>

          <section
            className="checkout-card"
            aria-labelledby="checkout-payment-title"
          >
            <header className="checkout-card__header">
              <span className="checkout-card__number" aria-hidden="true">
                3
              </span>

              <div>
                <span className="checkout-card__eyebrow">NAČIN PLAĆANJA</span>

                <h2
                  id="checkout-payment-title"
                  className="checkout-card__title"
                >
                  Kako želite da platite?
                </h2>

                <p className="checkout-card__description">
                  Izaberite način plaćanja prilikom preuzimanja porudžbine.
                </p>
              </div>
            </header>

            <div className="checkout-choice-group checkout-choice-group--payment">
              <label className="checkout-choice">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash"
                  checked={paymentMethod === "Cash"}
                  onChange={() => setPaymentMethod("Cash")}
                />

                <span className="checkout-choice__control">
                  <span className="checkout-choice__radio" />

                  <span
                    className="checkout-choice__payment-icon"
                    aria-hidden="true"
                  >
                    RSD
                  </span>

                  <span className="checkout-choice__content">
                    <strong>Gotovina</strong>

                    <small>
                      {isPickup
                        ? "Plaćanje u restoranu prilikom preuzimanja"
                        : "Plaćanje kuriru prilikom dostave"}
                    </small>
                  </span>
                </span>
              </label>

              <label className="checkout-choice">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CardOnDelivery"
                  checked={paymentMethod === "CardOnDelivery"}
                  onChange={() => setPaymentMethod("CardOnDelivery")}
                />

                <span className="checkout-choice__control">
                  <span className="checkout-choice__radio" />

                  <span
                    className="checkout-choice__payment-icon"
                    aria-hidden="true"
                  >
                    ▣
                  </span>

                  <span className="checkout-choice__content">
                    <strong>
                      {isPickup
                        ? "Kartica pri preuzimanju"
                        : "Kartica pri dostavi"}
                    </strong>

                    <small>
                      {isPickup
                        ? "Plaćanje karticom u restoranu"
                        : "Plaćanje putem terminala kuriru"}
                    </small>
                  </span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside
          className="checkout-summary"
          aria-labelledby="checkout-summary-title"
        >
          <header className="checkout-summary__header">
            <span className="checkout-summary__eyebrow">
              PREGLED PORUDŽBINE
            </span>

            <h2 id="checkout-summary-title" className="checkout-summary__title">
              Ukupan iznos
            </h2>

            <p className="checkout-summary__description">
              Proverite uslove i konačan iznos pre potvrde.
            </p>
          </header>

          <div className="checkout-summary__item-count">
            <span>Broj stavki</span>

            <strong>{state.items.length}</strong>
          </div>

          {loadingSettings && (
            <div
              className="checkout-loading checkout-loading--summary"
              role="status"
            >
              <span className="checkout-loading__spinner" aria-hidden="true" />

              <span>Učitavamo pravila dostave...</span>
            </div>
          )}

          {!loadingSettings && restaurantSettings && (
            <>
              {isDelivery && !restaurantSettings.isDeliveryEnabled && (
                <div className="checkout-summary__notice checkout-summary__notice--error">
                  <strong>Dostava trenutno nije dostupna</strong>

                  <p>Možete izabrati lično preuzimanje.</p>
                </div>
              )}

              <div className="checkout-summary__rows">
                <div className="checkout-summary__row">
                  <span>Hrana</span>

                  <strong>{subtotal.toLocaleString("sr-RS")} RSD</strong>
                </div>

                <div className="checkout-summary__row">
                  <span>Dostava</span>

                  <strong>
                    {isPickup
                      ? "Besplatno"
                      : deliveryFee === 0
                        ? "Besplatna"
                        : `${deliveryFee.toLocaleString("sr-RS")} RSD`}
                  </strong>
                </div>
              </div>

              <div className="checkout-summary__rules">
                Minimalna porudžbina
                {isDelivery && restaurantSettings.freeDeliveryThreshold && (
                  <div>
                    <span>Besplatna dostava preko</span>

                    <strong>
                      {restaurantSettings.freeDeliveryThreshold.toLocaleString(
                        "sr-RS",
                      )}{" "}
                      RSD
                    </strong>
                  </div>
                )}
              </div>

              {missingForMinimum > 0 && (
                <div className="checkout-summary__notice checkout-summary__notice--error">
                  <strong>
                    Nedostaje još {missingForMinimum.toLocaleString("sr-RS")}{" "}
                    RSD
                  </strong>

                  <p>
                    Dodajte još jela kako biste dostigli minimalnu porudžbinu.
                  </p>
                </div>
              )}

              {isDelivery &&
                missingForMinimum === 0 &&
                missingForFreeDelivery > 0 && (
                  <div className="checkout-summary__notice checkout-summary__notice--warning">
                    <strong>
                      Još {missingForFreeDelivery.toLocaleString("sr-RS")} RSD
                      do besplatne dostave
                    </strong>

                    <p>Porudžbinu već možete potvrditi.</p>
                  </div>
                )}

              {isDelivery &&
                missingForMinimum === 0 &&
                missingForFreeDelivery === 0 &&
                restaurantSettings.isDeliveryEnabled && (
                  <div className="checkout-summary__notice checkout-summary__notice--success">
                    <strong>Ostvarili ste besplatnu dostavu</strong>

                    <p>Cena dostave neće biti dodata na račun.</p>
                  </div>
                )}

              <div className="checkout-summary__total">
                <span>Ukupno</span>

                <strong>{totalAmount.toLocaleString("sr-RS")} RSD</strong>
              </div>
            </>
          )}

          <button
            type="button"
            className="checkout-summary__submit-button"
            disabled={
              loadingOrder ||
              (isDelivery && loadingAddresses) ||
              loadingSettings ||
              (isDelivery && !selectedAddressId) ||
              (isDelivery && !restaurantSettings?.isDeliveryEnabled) ||
              missingForMinimum > 0
            }
            onClick={onSubmit}
          >
            <span>
              {loadingOrder ? "Kreiramo porudžbinu..." : "Potvrdi porudžbinu"}
            </span>

            {!loadingOrder && (
              <span
                className="checkout-summary__submit-arrow"
                aria-hidden="true"
              >
                →
              </span>
            )}
          </button>

          <p className="checkout-summary__security">
            Podaci porudžbine obrađuju se bezbedno
          </p>
        </aside>
      </div>
    </main>
  );
}
