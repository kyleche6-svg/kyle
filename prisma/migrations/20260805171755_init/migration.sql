-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('none', 'active', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('buy', 'sell');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'none',
    "currentPeriodEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedFigure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "xHandle" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "TrackedFigure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "trackedFigureId" TEXT NOT NULL,
    "xPostId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "taggedTickers" TEXT[],

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "windowLabel" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "politicianName" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "amountRangeLow" INTEGER NOT NULL,
    "amountRangeHigh" INTEGER NOT NULL,
    "filedDate" TIMESTAMP(3) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedFigure_xHandle_key" ON "TrackedFigure"("xHandle");

-- CreateIndex
CREATE UNIQUE INDEX "Post_xPostId_key" ON "Post"("xPostId");

-- CreateIndex
CREATE INDEX "Post_postedAt_idx" ON "Post"("postedAt");

-- CreateIndex
CREATE INDEX "PriceSnapshot_postId_idx" ON "PriceSnapshot"("postId");

-- CreateIndex
CREATE INDEX "Trade_ticker_idx" ON "Trade"("ticker");

-- CreateIndex
CREATE INDEX "Trade_filedDate_idx" ON "Trade"("filedDate");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_trackedFigureId_fkey" FOREIGN KEY ("trackedFigureId") REFERENCES "TrackedFigure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
