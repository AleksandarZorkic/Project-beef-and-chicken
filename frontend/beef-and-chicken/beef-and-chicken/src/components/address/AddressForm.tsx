import type { AddressUpsertDto } from "../../api/addressApi";
import "./AddressForm.scss";

type AddressFormProps = {
  value: AddressUpsertDto;
  onChange: (value: AddressUpsertDto) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  saving: boolean;
  title?: string;
  submitLabel?: string;
};

export default function AddressForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  saving,
  title = "Nova adresa",
  submitLabel = "Sačuvaj adresu",
}: AddressFormProps) {
  return (
    <form
      className="address-form"
      aria-busy={saving}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <header className="address-form__header">
        <span className="address-form__eyebrow">PODACI ZA DOSTAVU</span>

        <h3 className="address-form__title">{title}</h3>

        <p className="address-form__description">
          Polja označena zvezdicom su obavezna.
        </p>
      </header>

      <div className="address-form__fields">
        <label className="address-form__field address-form__field--wide">
          <span className="address-form__label">
            Naziv adrese
            <small>Opcionalno</small>
          </span>

          <input
            className="address-form__input"
            type="text"
            placeholder="Na primer: Kuća ili Posao"
            value={value.label ?? ""}
            maxLength={50}
            disabled={saving}
            onChange={(event) =>
              onChange({
                ...value,
                label: event.target.value,
              })
            }
          />

          <small className="address-form__hint">
            Naziv služi da lakše prepoznate sačuvanu adresu.
          </small>
        </label>

        <label className="address-form__field address-form__field--street">
          <span className="address-form__label">
            Ulica
            <span className="address-form__required" aria-hidden="true">
              *
            </span>
          </span>

          <input
            className="address-form__input"
            type="text"
            placeholder="Naziv ulice"
            value={value.street}
            maxLength={100}
            required
            disabled={saving}
            onChange={(event) =>
              onChange({
                ...value,
                street: event.target.value,
              })
            }
          />
        </label>

        <label className="address-form__field address-form__field--number">
          <span className="address-form__label">
            Broj
            <span className="address-form__required" aria-hidden="true">
              *
            </span>
          </span>

          <input
            className="address-form__input"
            type="text"
            placeholder="Broj"
            value={value.houseNumber}
            maxLength={20}
            required
            disabled={saving}
            onChange={(event) =>
              onChange({
                ...value,
                houseNumber: event.target.value,
              })
            }
          />
        </label>

        <label className="address-form__field">
          <span className="address-form__label">
            Poštanski broj
            <small>Opcionalno</small>
          </span>

          <input
            className="address-form__input"
            type="text"
            inputMode="numeric"
            placeholder="Na primer: 11000"
            value={value.postalCode ?? ""}
            maxLength={20}
            disabled={saving}
            onChange={(event) =>
              onChange({
                ...value,
                postalCode: event.target.value,
              })
            }
          />
        </label>

        <label className="address-form__field">
          <span className="address-form__label">
            Grad
            <span className="address-form__required" aria-hidden="true">
              *
            </span>
          </span>

          <input
            className="address-form__input"
            type="text"
            placeholder="Naziv grada"
            value={value.city}
            maxLength={100}
            required
            disabled={saving}
            onChange={(event) =>
              onChange({
                ...value,
                city: event.target.value,
              })
            }
          />
        </label>

        <label className="address-form__field address-form__field--wide">
          <span className="address-form__label">
            Napomena za dostavu
            <small>Opcionalno</small>
          </span>

          <textarea
            className="address-form__textarea"
            rows={3}
            placeholder="Na primer: ulaz iz dvorišta, drugi sprat, pozvati pre dolaska..."
            value={value.note ?? ""}
            maxLength={200}
            disabled={saving}
            onChange={(event) =>
              onChange({
                ...value,
                note: event.target.value,
              })
            }
          />

          <small className="address-form__character-count">
            {(value.note ?? "").length}/200
          </small>
        </label>
      </div>

      <div className="address-form__footer">
        <label className="address-form__default-checkbox">
          <input
            type="checkbox"
            checked={value.isDefault}
            disabled={saving}
            onChange={(event) =>
              onChange({
                ...value,
                isDefault: event.target.checked,
              })
            }
          />

          <span className="address-form__default-control" aria-hidden="true">
            <svg viewBox="0 0 20 20">
              <path
                d="m4 10.5 3.5 3.5L16 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span className="address-form__default-content">
            <strong>Podrazumevana adresa</strong>

            <small>Automatski će biti izabrana prilikom poručivanja.</small>
          </span>
        </label>

        <div className="address-form__actions">
          {onCancel && (
            <button
              className="address-form__cancel-button"
              type="button"
              disabled={saving}
              onClick={onCancel}
            >
              Otkaži
            </button>
          )}

          <button
            className="address-form__submit-button"
            type="submit"
            disabled={saving}
          >
            {saving && (
              <span className="address-form__spinner" aria-hidden="true" />
            )}

            <span>{saving ? "Čuvam adresu..." : submitLabel}</span>

            {!saving && (
              <span className="address-form__submit-arrow" aria-hidden="true">
                →
              </span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
