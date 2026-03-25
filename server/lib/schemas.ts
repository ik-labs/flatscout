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
    availability_summary: {
      type: "array",
      items: { type: "string" },
      description: "Short bullets about unit availability and timing",
    },
    floor_plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          rent_range: { type: "string" },
          sqft_range: { type: "string" },
          available: { type: "string" },
        },
      },
      description: "Structured floor plan summaries",
    },
    fees_breakdown: {
      type: "array",
      items: { type: "string" },
      description: "Human-readable fees like application fee, parking fee, pet rent, utilities",
    },
    pet_details: {
      type: "array",
      items: { type: "string" },
      description: "Detailed pet policy notes including deposits and breed restrictions",
    },
    parking_details: {
      type: "array",
      items: { type: "string" },
      description: "Detailed parking notes including included spaces and optional paid spots",
    },
    lease_terms_detail: {
      type: "array",
      items: { type: "string" },
      description: "Lease term and policy bullets",
    },
    amenities_detail: {
      type: "array",
      items: { type: "string" },
      description: "Amenity highlights beyond the short amenity list",
    },
    qualification_requirements: {
      type: "array",
      items: { type: "string" },
      description: "Income, credit, insurance, and qualification requirements",
    },
    quiet_notes: {
      type: "array",
      items: { type: "string" },
      description: "Noise and quiet-related notes for this listing or neighborhood",
    },
    source_provenance: {
      type: "array",
      items: { type: "string" },
      description: "Which retrieval paths produced this record, e.g. search, extract, agent",
    },
  },
};

export const DISCOVERY_LISTINGS_SCHEMA = {
  type: "object",
  properties: {
    listings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          source_site: { type: "string" },
          rent: { type: "number" },
          bedrooms: { type: "number" },
          bathrooms: { type: "number" },
          sqft: { type: "number" },
          pet_policy: { type: "string" },
          parking: { type: "string" },
          laundry: { type: "string" },
          move_in_date: { type: "string" },
          availability_summary: {
            type: "array",
            items: { type: "string" },
          },
          floor_plans: LISTING_SCHEMA.properties.floor_plans,
          fees_breakdown: LISTING_SCHEMA.properties.fees_breakdown,
          pet_details: LISTING_SCHEMA.properties.pet_details,
          parking_details: LISTING_SCHEMA.properties.parking_details,
          lease_terms_detail: LISTING_SCHEMA.properties.lease_terms_detail,
          amenities_detail: LISTING_SCHEMA.properties.amenities_detail,
          qualification_requirements: LISTING_SCHEMA.properties.qualification_requirements,
          quiet_notes: LISTING_SCHEMA.properties.quiet_notes,
          source_provenance: LISTING_SCHEMA.properties.source_provenance,
        },
      },
    },
  },
};

export const DISCOVERY_SEED_SCHEMA = {
  type: "object",
  properties: {
    listings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          source_site: { type: "string" },
          rent: { type: "number" },
          bedrooms: { type: "number" },
          sqft: { type: "number" },
          pet_policy: { type: "string" },
          parking: { type: "string" },
          laundry: { type: "string" },
          availability_summary: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
};
