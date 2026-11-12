import type { AddressSnapshot } from '@/api/types';
import { formatCep } from '@/lib/format';

/** Endereço em duas linhas: "Rua, nº — compl." / "Bairro, Cidade - UF, CEP". */
export function AddressSummary({ address }: { address: AddressSnapshot }) {
  return (
    <address className="text-sm leading-relaxed text-muted not-italic">
      {address.street}, {address.number}
      {address.complement ? ` — ${address.complement}` : ''}
      <br />
      {address.neighborhood}, {address.city} - {address.state}, {formatCep(address.zipCode)}
    </address>
  );
}
