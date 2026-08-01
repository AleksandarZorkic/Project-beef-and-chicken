import type { AddressDto } from "../../api/addressApi";
import "./AddressSelector.scss";

type AddressSelectorProps = {
  addresses: AddressDto[];
  selectedAddressId: number | null;
  onSelect: (addressId: number) => void;
};

export default function AddressSelector({
  addresses,
  selectedAddressId,
  onSelect,
}: AddressSelectorProps) {
  if (addresses.length === 0) {
    return null;
  }

  return (
    <div
      className="address-selector"
      role="radiogroup"
      aria-label="Izaberite adresu za dostavu"
    >
      {addresses.map((address) => {
        const isSelected = selectedAddressId === address.id;

        return (
          <label
            key={address.id}
            className={[
              "address-selector__option",
              isSelected ? "address-selector__option--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              className="address-selector__input"
              type="radio"
              name="selectedAddress"
              checked={isSelected}
              onChange={() => onSelect(address.id)}
            />

            <span className="address-selector__card">
              <span className="address-selector__header">
                <span className="address-selector__radio" aria-hidden="true">
                  <span className="address-selector__radio-dot" />
                </span>

                <span className="address-selector__identity">
                  <span className="address-selector__eyebrow">
                    ADRESA ZA DOSTAVU
                  </span>

                  <strong className="address-selector__title">
                    {address.label?.trim() ? address.label : "Adresa"}
                  </strong>
                </span>

                {address.isDefault && (
                  <span className="address-selector__default-badge">
                    <span
                      className="address-selector__default-dot"
                      aria-hidden="true"
                    />
                    Podrazumevana
                  </span>
                )}
              </span>

              <span className="address-selector__address">
                <span
                  className="address-selector__location-icon"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <circle
                      cx="12"
                      cy="9"
                      r="2.3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                </span>

                <span className="address-selector__address-content">
                  <strong>
                    {address.street} {address.houseNumber}
                  </strong>

                  <span>
                    {address.postalCode ? `${address.postalCode} ` : ""}
                    {address.city}
                  </span>
                </span>
              </span>

              {address.note && (
                <span className="address-selector__note">
                  <span className="address-selector__note-label">Napomena</span>

                  <span className="address-selector__note-text">
                    {address.note}
                  </span>
                </span>
              )}

              {isSelected && (
                <span
                  className="address-selector__selected-mark"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
