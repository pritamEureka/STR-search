"use client";

import { useId, useState } from "react";
import { Controller, get, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UnderwritingFormValues } from "@/lib/underwriting/schema";

const NUMERIC = /[^0-9.\-]/g;

function parse(text: string): number | null {
  const cleaned = text.replace(NUMERIC, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const format = (n: number | null, grouped: boolean) =>
  n === null ? "" : grouped ? n.toLocaleString("en-US", { maximumFractionDigits: 6 }) : String(n);

/** Text input that exposes `number | null` and never loses a half-typed value like "5.". */
function NumericInput({
  value,
  onChange,
  onBlur,
  grouped = false,
  ...rest
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  /** Show thousands separators (applied when the field loses focus). */
  grouped?: boolean;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const [text, setText] = useState(format(value, grouped));
  // Resync only when the external value genuinely differs from what is typed
  // (e.g. a reset), so a half-typed "5." is never clobbered. Adjusting state during
  // render is the React-sanctioned alternative to a syncing effect.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (parse(text) !== value) setText(format(value, grouped));
  }

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const next = e.target.value.replace(/[^0-9.,$%\s-]/g, "");
        setText(next);
        onChange(parse(next));
      }}
      onBlur={(e) => {
        if (grouped) setText(format(parse(text), true));
        onBlur?.(e);
      }}
    />
  );
}

export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={id} role="alert" className="text-xs font-medium text-destructive">
        {error}
      </p>
    );
  }
  return hint ? (
    <p id={id} className="text-xs text-muted-foreground">
      {hint}
    </p>
  ) : null;
}

interface NumberFieldProps {
  name: string;
  label: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
  className?: string;
  /** Hide the label visually (used inside table-like rows) while keeping it accessible. */
  srOnlyLabel?: boolean;
  placeholder?: string;
}

export function NumberField({ name, label, prefix, suffix, hint, className, srOnlyLabel, placeholder }: NumberFieldProps) {
  const { control, formState } = useFormContext<UnderwritingFormValues>();
  const id = useId();
  const error = get(formState.errors, name)?.message as string | undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn(srOnlyLabel && "sr-only")}>
        {label}
      </Label>
      <Controller
        control={control}
        name={name as never}
        render={({ field }) => (
          <div className="relative">
            {prefix && (
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {prefix}
              </span>
            )}
            <NumericInput
              id={id}
              ref={field.ref}
              name={field.name}
              value={(field.value as number | null) ?? null}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={placeholder}
              grouped={prefix === "$"}
              data-field-path={name}
              aria-invalid={!!error}
              aria-describedby={`${id}-msg`}
              className={cn("tabular-nums", prefix && "pl-6", suffix && "pr-7")}
            />
            {suffix && (
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {suffix}
              </span>
            )}
          </div>
        )}
      />
      <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

export function TextField({
  name,
  label,
  className,
  srOnlyLabel,
  placeholder,
}: {
  name: string;
  label: string;
  className?: string;
  srOnlyLabel?: boolean;
  placeholder?: string;
}) {
  const { register, formState } = useFormContext<UnderwritingFormValues>();
  const id = useId();
  const error = get(formState.errors, name)?.message as string | undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn(srOnlyLabel && "sr-only")}>
        {label}
      </Label>
      <Input
        id={id}
        {...register(name as never)}
        placeholder={placeholder}
        data-field-path={name}
        aria-invalid={!!error}
        aria-describedby={`${id}-msg`}
        autoComplete="off"
      />
      <FieldMessage id={`${id}-msg`} error={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
  placeholder = "Select…",
  className,
  srOnlyLabel,
}: {
  name: string;
  label: string;
  options: string[];
  placeholder?: string;
  className?: string;
  srOnlyLabel?: boolean;
}) {
  const { control, formState } = useFormContext<UnderwritingFormValues>();
  const id = useId();
  const error = get(formState.errors, name)?.message as string | undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn(srOnlyLabel && "sr-only")}>
        {label}
      </Label>
      <Controller
        control={control}
        name={name as never}
        render={({ field }) => {
          const value = (field.value as string) || "";
          // A saved category that isn't in the preset list must still be selectable.
          const all = value && !options.includes(value) ? [...options, value] : options;
          return (
            <Select value={value || null} onValueChange={(v) => field.onChange(v ?? "")}>
              <SelectTrigger
                id={id}
                className="w-full"
                data-field-path={name}
                aria-invalid={!!error}
                aria-describedby={`${id}-msg`}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {all.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }}
      />
      <FieldMessage id={`${id}-msg`} error={error} />
    </div>
  );
}
