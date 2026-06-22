import api from "./https";

export interface AddressDto {
  id: number;
  street: string;
  houseNumber: string;
  postalCode?: string | null;
  city: string;
  label?: string | null;
  note?: string | null;
  isDefault: boolean;
}

export interface AddressUpsertDto {
  street: string;
  houseNumber: string;
  postalCode?: string | null;
  city: string;
  label?: string | null;
  note?: string | null;
  isDefault: boolean;
}

const addressesResource = "/addresses";
const addressByIdResource = (addressId: number) => `/addresses/${addressId}`;

export async function getAllAddresses() {
  const res = await api.get<AddressDto[]>(addressesResource);
  return res.data;
}

export async function getAddressById(addressId: number) {
  const res = await api.get<AddressDto>(addressByIdResource(addressId));
  return res.data;
}

export async function createAddress(addressDto: AddressUpsertDto) {
  const res = await api.post<AddressDto>(addressesResource, addressDto);
  return res.data;
}

export async function updateAddress(
  addressId: number,
  addressDto: AddressUpsertDto,
) {
  const res = await api.put<AddressDto>(
    addressByIdResource(addressId),
    addressDto,
  );
  return res.data;
}

export async function deleteAddress(addressId: number) {
  await api.delete(addressByIdResource(addressId));
}
