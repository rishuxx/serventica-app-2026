import { ServiceCardData } from './types';

// Real-world home services matching the user's reference designs and exact Android specs
export const mockServices: ServiceCardData[] = [
  // 1. Occasional Decors + Serventica Originals (Double ribbon, Visiting Free in #FFE100)
  {
    id: 'srv-decor-01',
    name: 'Occasional & Festive Home Decor',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop',
    rating: 4.95,
    reviewCount: 780,
    categories: ['Decor & Lighting', 'Celebrations', 'Floral Setup'],
    ribbon: {
      colorVariant: 'green',
      label: 'Occasional Decors',
    },
    secondaryRibbon: {
      colorVariant: 'yellow',
      label: 'Serventica Originals',
    },
    favorite: true,
    offer: {
      value: 'Visiting',
      suffix: 'Free',
      description: 'Get your Place Ready for Celebrations.',
      terms: 'Any Time, Any Where with us',
    },
    price: 999,
    originalPrice: 1499,
    durationMinutes: 90,
  },

  // 2. Painting (Single Green Ribbon: #52DF58 -> #204921, 20% OFF)
  {
    id: 'srv-paint-02',
    name: 'Full House Express Painting',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop',
    rating: 4.88,
    reviewCount: 2310,
    categories: ['Painting', 'Wall Care', 'Dulux Certified'],
    ribbon: {
      colorVariant: 'green',
      label: 'Painting',
    },
    favorite: true,
    offer: {
      value: '20%',
      suffix: 'OFF',
      description: 'Get Flat 20% off on Full house painting',
      terms: 'with us | T&C Apply.',
    },
    price: 4999,
    originalPrice: 6299,
    durationMinutes: 180,
  },

  // 3. Plumbing (Double Ribbon: Green 'Plumbing' + Orange 'Most Booked Service', Free After Services)
  {
    id: 'srv-plumb-03',
    name: 'Pipe Fitting & Leakage Diagnosis',
    image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=800&auto=format&fit=crop',
    rating: 4.82,
    reviewCount: 1650,
    categories: ['Plumbing', 'Genuine Spares', '30 Min Slot'],
    ribbon: {
      colorVariant: 'green',
      label: 'Plumbing',
    },
    secondaryRibbon: {
      colorVariant: 'orange',
      label: 'Most Booked Service',
    },
    favorite: false,
    offer: {
      value: 'Free',
      suffix: 'After Services',
      description: 'Get Free first after services off on Full',
      terms: 'house painting with us | T&C Apply.',
    },
    price: 199,
    originalPrice: 299,
    durationMinutes: 30,
  },

  // 4. Clean Default Card (NO ribbon - standard real market service)
  {
    id: 'srv-ac-04',
    name: 'AC Jet Pump Deep Cleaning',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop',
    rating: 4.86,
    reviewCount: 3120,
    categories: ['Air Conditioner', 'Filter Wash', 'Anti-Rust'],
    favorite: false,
    price: 599,
    originalPrice: 899,
    durationMinutes: 45,
  },

  // 5. Featured Service (Single Yellow Ribbon, Special Highlight)
  {
    id: 'srv-pest-05',
    name: 'Kitchen & Bathroom Pest Shield',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=800&auto=format&fit=crop',
    rating: 4.91,
    reviewCount: 920,
    categories: ['Pest Control', '100% Herbal', 'Child Safe'],
    ribbon: {
      colorVariant: 'yellow',
      label: 'Serventica Originals',
    },
    favorite: false,
    offer: {
      value: '50%',
      suffix: 'OFF',
      description: 'First booking special rate',
      terms: 'Includes 90-day re-service',
    },
    price: 799,
    originalPrice: 1199,
    durationMinutes: 40,
  },

  // 6. Last Used Service (Single Orange Ribbon, Repeat Booking)
  {
    id: 'srv-clean-06',
    name: 'Intense Stain Removal Bathroom Cleaning',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
    rating: 4.84,
    reviewCount: 4210,
    categories: ['Cleaning', 'Tiles & Grout', 'Sanitized'],
    ribbon: {
      colorVariant: 'orange',
      label: 'Booked 2w ago',
    },
    lastUsedDate: '28 Aug 2026',
    favorite: true,
    price: 449,
    originalPrice: 599,
    durationMinutes: 60,
  },

  // 7. Edge Case: Long title, No Ribbon, No Offer
  {
    id: 'srv-ro-07',
    name: 'RO Purifier Multi-Stage Membrane & Carbon Filter Replacement Service',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=800&auto=format&fit=crop',
    rating: 4.76,
    reviewCount: 410,
    categories: ['RO & Water Purifier', 'All Major Brands', 'TDS Calibration'],
    price: 849,
    originalPrice: 1099,
    durationMinutes: 50,
    favorite: false,
  },
];
