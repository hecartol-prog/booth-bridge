/** Onboarding business card JSON schema (verbatim from Onboarding.jsx). */
export const ONBOARDING_CARD_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    company: { type: "string" },
    email: { type: "string" },
    phone: { type: "string", description: "Office or main phone number" },
    mobile: { type: "string", description: "Mobile or cell phone number" },
    website: { type: "string" },
    linkedin: { type: "string" },
    industry: { type: "string" },
    company_address: { type: "string", description: "Full company address" },
    country: { type: "string", description: "Country of the company" },
    products_of_interest: {
      type: "array",
      items: { type: "string" },
      description:
        "Products, services, or categories the person handles or is interested in",
    },
  },
};
