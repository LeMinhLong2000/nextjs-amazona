import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Cart, OrderItem, ShippingAddress } from "@/types";
import { calcDeliveryDateAndPrice } from "@/lib/actions/order.actions";

const initialState: Cart = {
  items: [],
  itemsPrice: 0,
  taxPrice: undefined,
  shippingPrice: undefined,
  totalPrice: 0,
  paymentMethod: undefined,
  shippingAddress: undefined,
  deliveryDateIndex: undefined,
};

interface CartState {
  cart: Cart; //state of cart
  addItem: (item: OrderItem, quantity: number) => Promise<string>; //add item to cart, return Promise<string> (clientId of product).
  updateItem: (item: OrderItem, quantity: number) => Promise<void>; //update item in cart, return Promise<void> (clientId of product).
  removeItem: (item: OrderItem) => void; //remove item from cart from

  clearCart: () => void;
  setShippingAddress: (shippingAddress: ShippingAddress) => Promise<void>;
  setPaymentMethod: (paymentMethod: string) => void;
  setDeliveryDateIndex: (index: number) => Promise<void>;
}

const useCartStore = create(
  //create by zustand
  persist<CartState>(
    (set, get) => ({
      cart: initialState,

      /**
       * Add item to cart, return Promise<string> (clientId of product)
       * @param {OrderItem} item - item to add to cart
       * @param {number} quantity - quantity of item to add
       * @throws {Error} if item is out of stock
       * @returns {Promise<string>} clientId of added item
       */
      addItem: async (item: OrderItem, quantity: number) => {
        const { items, shippingAddress } = get().cart; //get list item current in cart

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
            ...(await calcDeliveryDateAndPrice({
              items: updatedCartItems,
              shippingAddress,
            })), // call calcDeliveryDateAndPrice ;... help expand return data and add to cart
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
      updateItem: async (item: OrderItem, quantity: number) => {
        const { items, shippingAddress } = get().cart;
        const exist = items.find(
          (x) =>
            x.product === item.product &&
            x.color === item.color &&
            x.size === item.size
        );
        if (!exist) return;

        const updatedCartItems = items.map((x) =>
          x.product === item.product &&
          x.color === item.color &&
          x.size === item.size
            ? { ...exist, quantity: quantity }
            : x
        );

        set({
          cart: {
            ...get().cart,
            items: updatedCartItems,
            ...(await calcDeliveryDateAndPrice({
              items: updatedCartItems,
              shippingAddress,
            })),
          },
        });
      },
      removeItem: async (item: OrderItem) => {
        const { items, shippingAddress } = get().cart;
        const updatedCartItems = items.filter(
          (x) =>
            x.product !== item.product ||
            x.color !== item.color ||
            x.size !== item.size
        );

        set({
          cart: {
            ...get().cart,
            items: updatedCartItems,
            ...(await calcDeliveryDateAndPrice({
              items: updatedCartItems,
              shippingAddress,
            })),
          },
        });
      },

      init: () => set({ cart: initialState }), //reset cart initialState

      setShippingAddress: async (shippingAddress: ShippingAddress) => {
        const { items } = get().cart;
        set({
          cart: {
            ...get().cart,
            shippingAddress,
            ...(await calcDeliveryDateAndPrice({
              items,
              shippingAddress,
            })),
          },
        });
      },

      setPaymentMethod: (paymentMethod: string) => {
        set({
          cart: {
            ...get().cart,
            paymentMethod,
          },
        });
      },
      setDeliveryDateIndex: async (index: number) => {
        const { items, shippingAddress } = get().cart;

        set({
          cart: {
            ...get().cart,
            ...(await calcDeliveryDateAndPrice({
              items,
              shippingAddress,
              deliveryDateIndex: index,
            })),
          },
        });
      },
      clearCart: () => {
        set({
          cart: {
            ...get().cart,
            items: [],
          },
        });
      },
    }),
    {
      name: "cart-store",
    }
  )
);
export default useCartStore;
