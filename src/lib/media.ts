import type { StaticImageData } from "next/image";

import acWall from "../../public/images/ac-wall.jpg";
import acCloseup from "../../public/images/ac-closeup.jpg";
import acOutdoor from "../../public/images/ac-outdoor.jpg";
import fridgeKitchen from "../../public/images/fridge-kitchen.jpg";
import fridgeBright from "../../public/images/fridge-bright-kitchen.jpg";
import kitchenModern from "../../public/images/kitchen-modern.jpg";
import washerLaundry from "../../public/images/washer-laundry.jpg";
import washerDrum from "../../public/images/washer-drum.jpg";
import microwaveCloseup from "../../public/images/microwave-closeup.jpg";
import microwaveKitchen from "../../public/images/microwave-kitchen.jpg";
import dishwasherRack from "../../public/images/dishwasher-rack.jpg";
import technicianRepair from "../../public/images/technician-repair.jpg";
import technicianPortrait from "../../public/images/technician-portrait.jpg";
import toolsFlatlay from "../../public/images/tools-flatlay.jpg";

/** Marketing / brand photography (see public/images/CREDITS.md). */
export const PHOTOS = {
  technicianRepair,
  technicianPortrait,
  toolsFlatlay,
  kitchenModern,
} satisfies Record<string, StaticImageData>;

export interface CategoryMedia {
  cover: StaticImageData;
  gallery: StaticImageData[];
  /** One-line description used on category headers and tiles */
  tagline: string;
}

export const CATEGORY_MEDIA: Record<string, CategoryMedia> = {
  ac: { cover: acCloseup, gallery: [acWall, acOutdoor], tagline: "Servicing, gas refill, repair and installation" },
  refrigerator: { cover: fridgeKitchen, gallery: [fridgeBright, kitchenModern], tagline: "Cooling issues, leaks, noise and deep cleaning" },
  washing_machine: { cover: washerLaundry, gallery: [washerDrum, toolsFlatlay], tagline: "Front-load and top-load repair and drum cleaning" },
  microwave: { cover: microwaveCloseup, gallery: [microwaveKitchen, technicianRepair], tagline: "Heating, turntable, door and panel repairs" },
  dishwasher: { cover: dishwasherRack, gallery: [kitchenModern, toolsFlatlay], tagline: "Drainage, spray arm, pump repair and installation" },
};

const SERVICE_PHOTOS: Record<string, StaticImageData> = {
  svc_001: acCloseup,
  svc_002: acWall,
  svc_003: acOutdoor,
  svc_004: fridgeKitchen,
  svc_005: fridgeBright,
  svc_006: washerLaundry,
  svc_007: washerDrum,
  svc_008: microwaveCloseup,
  svc_009: dishwasherRack,
  svc_010: kitchenModern,
};

/** Photo for a service, falling back to its category cover (e.g. for services created by admins). */
export function serviceImage(service: { id?: string; category: string }): StaticImageData | undefined {
  return (service.id && SERVICE_PHOTOS[service.id]) || CATEGORY_MEDIA[service.category]?.cover;
}

export function categoryImage(category: string): StaticImageData | undefined {
  return CATEGORY_MEDIA[category]?.cover;
}
