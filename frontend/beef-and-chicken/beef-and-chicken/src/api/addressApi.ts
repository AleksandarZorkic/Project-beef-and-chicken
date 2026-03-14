import api from "../api/http";

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

const customerAddressesResource = (customerId: number) =>
  `/customers/${customerId}/addresses`;

const customerAddressByIdResource = (customerId: number, addressId: number) =>
  `/customers/${customerId}/addresses/${addressId}`;

export async function getAllAddresses(customerId: number) {
  const res = await api.get<AddressDto>(customerAddressesResource);
  return res.data;
}

export async function getAddressById(customerId: number, addressId: number) {
  const res = await api.get<AddressDto>(customerAddressByIdResource);
  return res.data;
}

export async function createAddress(
  customerId: number,
  addressDto: AddressUpsertDto,
) {
  const res = await api.post<AddressDto>(customerAddressesResource);
  return res.data;
}

export async function updateAddress(
  customerId: number,
  addressId: number,
  addressDto: AddressUpsertDto,
) {
  const res = await api.put<AddressDto>(customerAddressByIdResource);
  return res.data;
}

export async function deleteAddress(customerId: number, addressId: number) {
  const res = await api.delete<AddressDto>(customerAddressByIdResource);
  return res.data;
}
