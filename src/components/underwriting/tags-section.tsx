"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { DealTagKey } from "@/lib/types";
import type { UnderwritingFormValues } from "@/lib/underwriting/schema";

const TAGS: { key: DealTagKey; label: string; hint: string }[] = [
  { key: "turnkey", label: "Turnkey", hint: "Ready to host on day one" },
  { key: "furnished", label: "Furnished", hint: "Sold or being set up furnished" },
  { key: "luxury", label: "Luxury", hint: "High-end finishes and amenities" },
  { key: "tax_efficient", label: "Tax efficient", hint: "Depreciation does heavy lifting" },
  { key: "new_construction", label: "New construction", hint: "Recently built" },
  { key: "existing_airbnb", label: "Existing Airbnb", hint: "Already operating as a rental" },
  { key: "arv", label: "ARV", hint: "After-repair value play" },
  { key: "high_cash_on_cash", label: "High cash-on-cash", hint: "Strong cash return" },
  { key: "low_cash_on_cash", label: "Low cash-on-cash", hint: "Thin cash return" },
  { key: "add_inground_pool", label: "Add in-ground pool", hint: "Pool is part of the plan" },
  { key: "waterfront", label: "Waterfront", hint: "On a lake, river or coast" },
  { key: "remote", label: "Remote", hint: "Far from the owner" },
  { key: "can_support_cohost", label: "Can support co-host", hint: "Margins allow a co-host fee" },
];

export function TagsSection() {
  const { control } = useFormContext<UnderwritingFormValues>();
  return (
    <Card id="tags">
      <CardHeader>
        <CardTitle>Deal tags</CardTitle>
        <CardDescription>Yes/no labels that describe the deal at a glance. They don&apos;t affect your score.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {TAGS.map(({ key, label, hint }) => (
            <li key={key}>
              <Controller
                control={control}
                name={`tags.${key}`}
                render={({ field }) => (
                  <label
                    htmlFor={`tag-${key}`}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-checked]]:border-primary/40 has-[[data-checked]]:bg-primary/5"
                  >
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                    <Switch id={`tag-${key}`} checked={!!field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
