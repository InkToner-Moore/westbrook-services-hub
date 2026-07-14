import { round2 } from './simpleReceipt';

// An order (or receipt) can cover several cartridges for the same customer, so
// brand/model/type/price live on each line rather than on the order itself.

export interface CartridgeLine {
  brand: string;
  model: string;
  type: string;
  price?: number;
}

export const CARTRIDGE_BRANDS = ['HP', 'Canon', 'Epson', 'Brother', 'Lexmark'];

export const CARTRIDGE_TYPES: { value: string; label: string }[] = [
  { value: 'Black', label: 'Black' },
  { value: 'Color', label: 'Color (Tri-color)' },
  { value: 'Cyan', label: 'Cyan' },
  { value: 'Magenta', label: 'Magenta' },
  { value: 'Yellow', label: 'Yellow' },
  { value: 'Photo Black', label: 'Photo Black' },
];

export const isFilledNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const emptyCartridgeLine = (): CartridgeLine => ({
  brand: '',
  model: '',
  type: '',
  price: undefined,
});

// "HP 564XL (Black)" — brand and type are optional, so build from what's filled in.
export const describeCartridge = (line: CartridgeLine) => {
  const name = [line.brand, line.model].filter(Boolean).join(' ').trim();
  return line.type ? `${name} (${line.type})` : name;
};

export const cartridgesSubtotal = (lines: CartridgeLine[]) =>
  round2(lines.reduce((sum, line) => sum + (isFilledNumber(line.price) ? line.price : 0), 0));

// Firestore rejects `undefined`, so drop the price key entirely when it's unset.
export const toStoredCartridge = (line: CartridgeLine): CartridgeLine => {
  const stored: CartridgeLine = {
    brand: line.brand ?? '',
    model: line.model.trim(),
    type: line.type ?? '',
  };
  if (isFilledNumber(line.price)) {
    stored.price = line.price;
  }
  return stored;
};

// Orders created before multi-cartridge support stored a single cartridge inline
// on the order document. Read those as a one-line order.
export const readCartridgeLines = (source: Record<string, any>): CartridgeLine[] => {
  if (Array.isArray(source.cartridges) && source.cartridges.length > 0) {
    return source.cartridges;
  }
  return [
    {
      brand: source.cartridgeBrand ?? '',
      model: source.cartridgeModel ?? '',
      type: source.cartridgeType ?? '',
      price: isFilledNumber(source.price) ? source.price : undefined,
    },
  ];
};
