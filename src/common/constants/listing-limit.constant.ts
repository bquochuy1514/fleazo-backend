import { ProductStatus } from '../../generated/prisma/client';

// Which statuses occupy one of a seller's plan.maxActiveListings slots.
// PENDING counts too (not just ACTIVE) so a seller can't queue unlimited
// listings for review; DRAFT doesn't (not public yet, no feed/moderation
// cost). Shared by ProductsService (enforces the cap) and MembershipService
// (reports usage on /membership/me) — single source of truth so the two
// never drift apart.
export const ACTIVE_LISTING_STATUSES: ProductStatus[] = [
  ProductStatus.PENDING,
  ProductStatus.ACTIVE,
];
