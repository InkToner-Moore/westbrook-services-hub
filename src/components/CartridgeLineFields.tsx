import { useFormClasses, FormSection, FieldGrid, Field, ItemCard, AddRowButton } from "@/components/shell/FormKit";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CARTRIDGE_BRANDS,
  CARTRIDGE_TYPES,
  cartridgesSubtotal,
  emptyCartridgeLine,
  isFilledNumber,
} from "@/lib/cartridges";

interface CartridgeLineFieldsProps {
  // Any form with a `cartridges: CartridgeLine[]` field , the order forms in the
  // cartridge manager and the receipt form both qualify.
  form: UseFormReturn<any>;
  themeClasses: any;
  // Receipts can't leave a price to be filled in later, orders can.
  requirePrice?: boolean;
  // Single column, for the narrow sidebar/dialog layouts.
  compact?: boolean;
}


// Repeatable brand/model/type/price block , one per cartridge on an order or receipt.
const CartridgeLineFields = ({
  form,
  requirePrice = false,
}: CartridgeLineFieldsProps) => {
  const kit = useFormClasses();
  const { control, register, setValue, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'cartridges' });
  const subtotal = cartridgesSubtotal(watch('cartridges') ?? []);

  return (
    <FormSection title="Cartridges" action={<AddRowButton onClick={() => append(emptyCartridgeLine())}>Add cartridge</AddRowButton>}>
      <div className="space-y-3">
      {fields.map((field, index) => (
        <ItemCard key={field.id} title={`Cartridge ${index + 1}`} onRemove={fields.length > 1 ? () => remove(index) : undefined} removeLabel="Remove this cartridge">
          <FieldGrid>
            <Field label="Brand" span={3} half>
              <Select
                value={watch(`cartridges.${index}.brand`) || undefined}
                onValueChange={(value) => setValue(`cartridges.${index}.brand`, value)}
              >
                <SelectTrigger className={kit.input}>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {CARTRIDGE_BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Type" span={3} half>
              <Select
                value={watch(`cartridges.${index}.type`) || undefined}
                onValueChange={(value) => setValue(`cartridges.${index}.type`, value)}
              >
                <SelectTrigger className={kit.input}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CARTRIDGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Model" span={4} required error={form.formState.errors.cartridges?.[index]?.model?.message as string}>
              <Input
                {...register(`cartridges.${index}.model`, { required: 'Model is required' })}
                placeholder="e.g. HP 564XL, Canon PG-245"
                className={kit.input}
              />
            </Field>

            <Field
              label="Price ($)"
              span={2}
              half
              required={requirePrice}
              hint={requirePrice ? undefined : "Blank if unknown"}
              error={form.formState.errors.cartridges?.[index]?.price?.message as string}
            >
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                {...register(`cartridges.${index}.price`, {
                  valueAsNumber: true,
                  validate: (value: unknown) =>
                    !requirePrice ||
                    (isFilledNumber(value) && value >= 0) ||
                    'A valid price is required',
                })}
                className={`${kit.input} ${kit.mono}`}
              />
            </Field>
          </FieldGrid>
        </ItemCard>
      ))}
      </div>

      {/* Only worth showing once there's more than one line to add up. */}
      {fields.length > 1 && (
        <div className="flex justify-between text-sm font-semibold transition-colors duration-300 text-pub-ink">
          <span>Subtotal</span>
          <span className="font-mono tabular-nums">${subtotal.toFixed(2)}</span>
        </div>
      )}
    </FormSection>
  );
};

export default CartridgeLineFields;
