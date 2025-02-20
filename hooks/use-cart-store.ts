import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Cart, OrderItem } from "@/types";
import { calcDeliveryDateAndPrice } from "@/lib/actions/order.actions";

const initialState: Cart = {
  items: [],
  itemsPrice: 0,
  taxPrice: undefined,
  shippingPrice: undefined,
  totalPrice: 0,
  paymentMethod: undefined,
  deliveryDateIndex: undefined,
};

interface CartState {
  cart: Cart; //state of cart
  addItem: (item: OrderItem, quantity: number) => Promise<string>; //add item to cart, return Promise<string> (clientId of product).
}

const useCartStore = create(
  //create by zustand
  persist<CartState>(
    (set, get) => ({
      cart: initialState,

      addItem: async (item: OrderItem, quantity: number) => {
        const { items } = get().cart; //get list item current in cart

        // check if item is already in cart
        const existItem = items.find(
          (x) =>
            x.product === item.product &&
            x.color === item.color &&
            x.size === item.size
        );

        // check if item is out of stock
        if (existItem) {
          if (existItem.countInStock < quantity + existItem.quantity) {
            throw new Error("Not enough items in stock");
          }
        } else {
          if (item.countInStock < item.quantity) {
            throw new Error("Not enough items in stock");
          }
        }

        // update cart
        const updatedCartItems = existItem
          ? items.map((x) =>
              x.product === item.product &&
              x.color === item.color &&
              x.size === item.size
                ? { ...existItem, quantity: existItem.quantity + quantity } //...existItem: copy all attribute of existItem.
                : x
            ) // update quantity of item in cart
          : [...items, { ...item, quantity }]; //add new cart items

        // update status of cart with price and delivery
        set({
          cart: {
            ...get().cart, // keep all attributes in current cart
            items: updatedCartItems, // update list items
            ...(await calcDeliveryDateAndPrice({ items: updatedCartItems })), // call calcDeliveryDateAndPrice ;... help expand return data and add to cart
          },
        });

        // find item just add in cart; return clientId
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        return updatedCartItems.find(
          (x) =>
            x.product === item.product &&
            x.color === item.color &&
            x.size === item.size
        )?.clientId!;
      },
      init: () => set({ cart: initialState }), //reset cart initialState
    }),
    {
      name: "cart-store",
    }
  )
);
export default useCartStore;
