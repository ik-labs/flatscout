export const LISTING_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Apartment/building name" },
    address: { type: "string", description: "Full address" },
    rent: { type: "number", description: "Monthly rent in USD" },
    bedrooms: { type: "number", description: "Number of bedrooms" },
    bathrooms: { type: "number", description: "Number of bathrooms" },
    sqft: { type: "number", description: "Square footage" },
    pet_policy: { type: "string", description: "Pet policy (e.g. cats ok, no dogs, pet deposit $300)" },
    parking: { type: "string", description: "Parking details" },
    laundry: { type: "string", description: "Laundry availability (in-unit, on-site, none)" },
    lease_terms: { type: "string", description: "Lease length options" },
    move_in_date: { type: "string", description: "Earliest available move-in date" },
    amenities: {
      type: "array",
      items: { type: "string" },
      description: "List of amenities",
    },
    fees: {
      type: "object",
      properties: {
        application_fee: { type: "number" },
        security_deposit: { type: "number" },
        admin_fee: { type: "number" },
        pet_deposit: { type: "number" },
      },
      description: "All fees associated with the listing",
    },
    utilities_included: {
      type: "array",
      items: { type: "string" },
      description: "Utilities included in rent",
    },
    contact_phone: { type: "string", description: "Contact phone number" },
    contact_email: { type: "string", description: "Contact email" },
  },
};
