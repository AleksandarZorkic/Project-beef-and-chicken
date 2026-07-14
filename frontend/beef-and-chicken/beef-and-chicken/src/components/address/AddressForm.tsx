import type { AddressUpsertDto } from "../../api/addressApi";

type AddressFormProps = {
  value: AddressUpsertDto;
  onChange: (value: AddressUpsertDto) => void;
  onSubmit: () => void;
  saving: boolean;
  title?: string;
  submitLabel?: string;
};

export default function AddressForm({
  value,
  onChange,
  onSubmit,
  saving,
  title = "Nova adresa",
  submitLabel = "Sačuvaj adresu",
}: AddressFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      style={{
        marginTop: 16,
        padding: 16,
        border: "1px solid #ccc",
        borderRadius: 8,
      }}
    >
      <h3>{title}</h3>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          type="text"
          placeholder="Labela (Kuća, Posao)"
          value={value.label ?? ""}
          maxLength={50}
          disabled={saving}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />

        <input
          type="text"
          placeholder="Ulica"
          value={value.street}
          maxLength={100}
          required
          disabled={saving}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
        />

        <input
          type="text"
          placeholder="Broj"
          value={value.houseNumber}
          maxLength={20}
          required
          disabled={saving}
          onChange={(e) => onChange({ ...value, houseNumber: e.target.value })}
        />

        <input
          type="text"
          placeholder="Poštanski broj"
          value={value.postalCode ?? ""}
          maxLength={20}
          disabled={saving}
          onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
        />

        <input
          type="text"
          placeholder="Grad"
          value={value.city}
          maxLength={100}
          required
          disabled={saving}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
        />

        <textarea
          rows={3}
          placeholder="Napomena"
          value={value.note ?? ""}
          maxLength={200}
          disabled={saving}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={value.isDefault}
            disabled={saving}
            onChange={(e) =>
              onChange({ ...value, isDefault: e.target.checked })
            }
          />
          Postavi kao podrazumevanu adresu
        </label>

        <button type="submit" disabled={saving}>
          {saving ? "Čuvam adresu..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
