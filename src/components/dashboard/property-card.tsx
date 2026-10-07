"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/rating";
import { PropertyActions, type PropertyActionProps } from "./property-actions";
import { AttemptSummary, PropertyFacts } from "./property-summary";

export function PropertyCard({ property: p, ...actions }: PropertyActionProps) {
  const street = p.address?.split(",")[0] ?? p.zpid;

  return (
    <Card className="gap-0 overflow-hidden py-0" data-testid={`property-card-${p.zpid}`} data-status={p.status}>
      <div className="relative aspect-video bg-muted">
        {p.img_src && (
          <Image
            src={p.img_src}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={p.status} />
        </div>
        <div className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 text-sm font-semibold tabular-nums shadow-sm">
          {p.price}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-semibold leading-snug">{street}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" /> {p.city}, {p.state}
          </p>
          <p className="mt-1 inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {p.market_name}
          </p>
        </div>
        <PropertyFacts property={p} />
        <AttemptSummary property={p} />
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <PropertyActions property={p} {...actions} />
        </div>
      </CardContent>
    </Card>
  );
}
