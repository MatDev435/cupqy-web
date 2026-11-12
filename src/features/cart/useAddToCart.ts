import { useState } from 'react';
import { useNavigate } from 'react-router';
import { validateCart } from '@/api/cart';
import { getErrorMessage } from '@/api/errors';
import type { CupcakeSummary } from '@/api/types';
import { useToast } from '@/components/ui';
import { useCart } from './cartContext';
import { MAX_QUANTITY_PER_ITEM } from './cartStore';

/**
 * Adiciona ao carrinho validando com o servidor (US07 CA#04 e RN#01): preço e estoque do dia são
 * conferidos em POST /cart/validate antes de alterar o carrinho local.
 */
export function useAddToCart() {
  const cart = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const add = async (cupcake: CupcakeSummary, quantity = 1) => {
    const inCart = cart.getQuantity(cupcake.id);
    const desired = Math.min(inCart + quantity, MAX_QUANTITY_PER_ITEM);
    if (desired <= inCart) {
      toast({
        tone: 'warning',
        title: 'Limite por item atingido',
        description: `É possível pedir até ${MAX_QUANTITY_PER_ITEM} unidades de cada cupcake.`,
      });
      return false;
    }

    setPendingId(cupcake.id);
    try {
      const evaluation = await validateCart([{ cupcakeId: cupcake.id, quantity: desired }]);
      const line = evaluation.items[0];
      if (!line || line.status === 'UNAVAILABLE') {
        toast({ tone: 'error', title: `${cupcake.name} não está mais disponível.` });
        return false;
      }
      if (line.status === 'SOLD_OUT') {
        toast({ tone: 'error', title: `${cupcake.name} esgotou hoje.` });
        return false;
      }

      const available = line.status === 'INSUFFICIENT_STOCK' ? line.availableQuantity : desired;
      const toAdd = Math.max(0, available - inCart);
      if (toAdd === 0) {
        toast({
          tone: 'warning',
          title: 'Quantidade máxima no carrinho',
          description: `Hoje temos ${line.availableQuantity} unidade(s) de ${cupcake.name} e todas já estão no seu carrinho.`,
        });
        return false;
      }

      const result = cart.addItem(
        cupcake.id,
        {
          name: line.name ?? cupcake.name,
          flavor: line.flavor ?? cupcake.flavor,
          imageUrl: line.imageUrl ?? cupcake.imageUrl,
          priceCents: line.unitPriceCents ?? cupcake.priceCents,
        },
        toAdd,
        line.availableQuantity,
      );
      if (!result.ok) {
        toast({
          tone: 'warning',
          title: 'Carrinho cheio',
          description: 'O carrinho aceita até 30 cupcakes diferentes.',
        });
        return false;
      }

      toast({
        tone: toAdd < quantity ? 'warning' : 'success',
        title: toAdd < quantity ? 'Adicionamos o que havia em estoque' : 'Adicionado ao carrinho',
        description: `${toAdd}× ${cupcake.name}`,
        action: { label: 'Ver carrinho', onClick: () => navigate('/carrinho') },
      });
      return true;
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Não foi possível adicionar',
        description: getErrorMessage(error),
      });
      return false;
    } finally {
      setPendingId(null);
    }
  };

  return { add, pendingId };
}
