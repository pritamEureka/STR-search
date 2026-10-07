import Image from "next/image";
import { Bath, BedDouble, Clock, MapPin, Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Market, Property } from "@/lib/types";

export function PropertyHeader({
  address,
  property,
  market,
}: {
  address: string | null;
  property?: Property;
  market?: Market;
}) {
  const [street, ...rest] = (address ?? property?.address ?? "").split(",");
  return (
    <Card className="gap-0 overflow-hidden py-0 sm:flex-row" data-testid="property-header">
      <div className="relative h-36 shrink-0 bg-muted sm:h-auto sm:w-56">
        {property?.img_src && <Image src={property.img_src} alt="" fill unoptimized sizes="224px" className="object-cover" />}
      </div>
      <div className="grid flex-1 gap-4 p-4 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          <div>
            <h1 className="text-xl font-semibold leading-tight">{street}</h1>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {rest.join(",").trim()}
            </p>
          </div>
          {property ? (
            <>
              <p className="text-2xl font-semibold tabular-nums">{property.price}</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5"><BedDouble className="size-4" /> {property.beds} bd</li>
                <li className="flex items-center gap-1.5"><Bath className="size-4" /> {property.baths} ba</li>
                <li className="flex items-center gap-1.5"><Ruler className="size-4" /> {property.area?.toLocaleString()} sqft</li>
                {property.time_on_zillow && (
                  <li className="flex items-center gap-1.5"><Clock className="size-4" /> {property.time_on_zillow} on market</li>
                )}
              </ul>
            </>
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
        </div>
        <div className="rounded-lg bg-muted/60 p-3 text-sm" data-testid="market-info">
          {market ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Market{market.region ? ` · ${market.region}` : ""}
              </p>
              <p className="font-semibold">{market.name}</p>
              <p className="mt-1 text-muted-foreground">{market.description}</p>
            </>
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
        </div>
      </div>
    </Card>
  );
}
