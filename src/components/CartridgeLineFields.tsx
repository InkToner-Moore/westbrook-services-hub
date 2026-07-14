import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  CARTRIDGE_BRANDS,
  CARTRIDGE_TYPES,
  cartridgesSubtotal,
  emptyCartridgeLine,
  isFilledNumber,
} from "@/lib/cartridges";

interface CartridgeLineFieldsProps {
  // Any form with a `cartridges: CartridgeLine[]` field — the order forms in the
  // cartridge manager and the receipt form both qualify.
  form: UseFormReturn<any>;
  themeClasses: any;
  // Receipts can't leave a price to be filled in later, orders can.
  requirePrice?: boolean;
  // Single column, for the narrow sidebar/dialog layouts.
  compact?: boolean;
}

// Marks a form field as required.
const RequiredMark = () => (
  <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
);

// Repeatable brand/model/type/price block — one per cartridge on an order or receipt.
const CartridgeLineFields = ({
  form,
  themeClasses,
  requirePrice = false,
  compact = false,
}: CartridgeLineFieldsProps) => {
  const { control, register, setValue, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'cartridges' });
  const subtotal = cartridgesSubtotal(watch('cartridges') ?? []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>
          Cartridges
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append(emptyCartridgeLine())}
          className={`transition-all duration-300 ${themeClasses.button.ghost}`}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Cartridge
        </Button>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className={`rounded-xl border p-4 space-y-3 transition-all duration-300 ${themeClasses.card.secondary}`}
        >
          <div className="flex justify-between items-center">
            <span className={`text-sm font-semibold transition-colors duration-300 ${themeClasses.text.primary}`}>
              Cartridge {index + 1}
            </span>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className={`transition-all duration-300 ${themeClasses.button.danger}`}
                title="Remove this cartridge"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-3 ${compact ? '' : 'md:grid-cols-2'}`}>
            <div>
              <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Brand</Label>
              <Select
                value={watch(`cartridges.${index}.brand`) || undefined}
                onValueChange={(value) => setValue(`cartridges.${index}.brand`, value)}
              >
                <SelectTrigger className={`transition-all duration-300 ${themeClasses.input}`}>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {CARTRIDGE_BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Type</Label>
              <Select
                value={watch(`cartridges.${index}.type`) || undefined}
                onValueChange={(value) => setValue(`cartridges.${index}.type`, value)}
              >
                <SelectTrigger className={`transition-all duration-300 ${themeClasses.input}`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CARTRIDGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>
                Model<RequiredMark />
              </Label>
              <Input
                {...register(`cartridges.${index}.model`, { required: 'Model is required' })}
                placeholder="e.g. HP 564XL, Canon PG-245"
                className={`transition-all duration-300 ${themeClasses.input}`}
              />
            </div>

            <div>
              <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>
                Price ($){requirePrice && <RequiredMark />}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder={requirePrice ? "Enter the refill price" : "Leave blank if unspecified"}
                {...register(`cartridges.${index}.price`, {
                  valueAsNumber: true,
                  validate: (value: unknown) =>
                    !requirePrice ||
                    (isFilledNumber(value) && value >= 0) ||
                    'A valid price is required',
                })}
                className={`transition-all duration-300 ${themeClasses.input}`}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Only worth showing once there's more than one line to add up. */}
      {fields.length > 1 && (
        <div className={`flex justify-between text-sm font-semibold transition-colors duration-300 ${themeClasses.text.primary}`}>
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};

export default CartridgeLineFields;
