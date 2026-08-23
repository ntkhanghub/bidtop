-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'pending_payment', 'paid_pending_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('pending', 'confirmed', 'failed');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'super_admin');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_vi" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "identity_key" TEXT NOT NULL,
    "display_url" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "first_confirmed_at" TIMESTAMP(3),
    "submitter_email" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "delta_amount" INTEGER NOT NULL,
    "vat_amount" INTEGER NOT NULL,
    "total_charged" INTEGER NOT NULL,
    "gateway_order_id" TEXT NOT NULL,
    "gateway_txn_id" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "listings_identity_key_key" ON "listings"("identity_key");

-- CreateIndex
CREATE INDEX "listings_status_amount_first_confirmed_at_idx" ON "listings"("status", "amount", "first_confirmed_at");

-- CreateIndex
CREATE INDEX "listings_category_id_status_amount_first_confirmed_at_idx" ON "listings"("category_id", "status", "amount", "first_confirmed_at");

-- CreateIndex
CREATE UNIQUE INDEX "bids_gateway_order_id_key" ON "bids"("gateway_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
