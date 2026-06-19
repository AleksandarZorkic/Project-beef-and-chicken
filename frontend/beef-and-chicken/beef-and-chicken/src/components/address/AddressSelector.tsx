import type { AddressDto } from "../../api/addressApi";

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
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      {addresses.map((address) => (
        <label
          key={address.id}
          style={{
            display: "block",
            border:
              selectedAddressId === address.id
                ? "2px solid black"
                : "1px solid #ccc",
            borderRadius: 8,
            padding: 12,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="radio"
              name="selectedAddress"
              checked={selectedAddressId === address.id}
              onChange={() => onSelect(address.id)}
            />
            <strong>{address.label ?? "Adresa"}</strong>
            {address.isDefault && (
              <span style={{ fontSize: 12, color: "green" }}>
                (Podrazumevana)
              </span>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            {address.street} {address.houseNumber}
          </div>

          <div>
            {address.postalCode ? `${address.postalCode} ` : ""}
            {address.city}
          </div>

          {address.note && (
            <div style={{ marginTop: 6, fontStyle: "italic" }}>
              Napomena: {address.note}
            </div>
          )}
        </label>
      ))}
    </div>
  );
}
