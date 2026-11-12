import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateAddressBody, UpdateAddressBody } from '@/api/contract';
import { createAddress, deleteAddress, listAddresses, updateAddress } from '@/api/profile';
import { queryKeys } from '@/api/queryKeys';

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: ({ signal }) => listAddresses(signal),
    enabled,
  });
}

export function useAddressMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses });

  return {
    create: useMutation({
      mutationFn: (body: CreateAddressBody) => createAddress(body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateAddressBody }) =>
        updateAddress(id, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteAddress(id),
      onSuccess: invalidate,
    }),
  };
}
