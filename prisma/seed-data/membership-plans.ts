// Free must exist here too (not a hardcoded constant) so every tier's limits
// are configurable from the same place — see schema.prisma MembershipPlan comment.
export const membershipPlansSeedData = [
  {
    key: 'FREE',
    name: 'Miễn phí',
    price: 0,
    durationDays: 0,
    maxActiveListings: 3,
    listingDurationDays: 30,
    maxImagesPerListing: 3,
    sortOrder: 0,
  },
  {
    key: 'BASIC',
    name: 'Basic',
    price: 25000,
    durationDays: 30,
    maxActiveListings: 7,
    listingDurationDays: 45,
    maxImagesPerListing: 5,
    sortOrder: 1,
  },
  {
    key: 'PREMIUM',
    name: 'Premium',
    price: 59000,
    durationDays: 30,
    maxActiveListings: 15,
    listingDurationDays: 60,
    maxImagesPerListing: 8,
    sortOrder: 2,
  },
];
