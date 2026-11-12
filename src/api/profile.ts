import type {
  CreateAddressBody,
  DeleteAccountBody,
  UpdateAddressBody,
  UpdateProfileBody,
} from './contract';
import { getData, request, sendData } from './http';
import type { Address, Profile } from './types';

/** Perfil, papel e permissões — fonte confiável do papel do usuário (lido do banco pela API). */
export function getMe(signal?: AbortSignal) {
  return getData<Profile>('/users/me', { auth: 'required', signal });
}

export function updateMe(body: UpdateProfileBody) {
  return sendData<Profile>('PATCH', '/users/me', { body, auth: 'required' });
}

/** Exclusão de conta (LGPD): a API reconfirma a senha e bloqueia com pedidos em andamento. */
export function deleteMe(body: DeleteAccountBody) {
  return request<void>('/users/me', { method: 'DELETE', body, auth: 'required' });
}

export function listAddresses(signal?: AbortSignal) {
  return getData<Address[]>('/users/me/addresses', { auth: 'required', signal });
}

export function createAddress(body: CreateAddressBody) {
  return sendData<Address>('POST', '/users/me/addresses', { body, auth: 'required' });
}

export function updateAddress(addressId: string, body: UpdateAddressBody) {
  return sendData<Address>('PATCH', `/users/me/addresses/${encodeURIComponent(addressId)}`, {
    body,
    auth: 'required',
  });
}

export function deleteAddress(addressId: string) {
  return request<void>(`/users/me/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
    auth: 'required',
  });
}
