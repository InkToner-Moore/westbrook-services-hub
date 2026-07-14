// The public-read mirror of a cartridge order. Staff write it from the cartridge
// manager; customers read it from the home page to check on a refill. It holds
// the bare minimum needed for that lookup and nothing else.

export const ORDER_STATUS_COLLECTION = 'orderStatus';

export interface OrderStatusDoc {
  orderId: string;
  customerPhone: string;
  customerLastName: string; // stored normalized so lookups are case-insensitive
  status: string;
}

export const normalizeLastName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

// Last whitespace-separated word of the customer's name. Names are entered as
// "Firstname Lastname" at the counter, so this is what a customer will type in.
export const lastNameOf = (customerName: string) => {
  const parts = normalizeLastName(customerName).split(' ');
  return parts[parts.length - 1] ?? '';
};
