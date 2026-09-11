-- CreateTable
CREATE TABLE "ExcludedIngredient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcludedIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExcludedIngredient_userId_idx" ON "ExcludedIngredient"("userId");

-- AddForeignKey
ALTER TABLE "ExcludedIngredient" ADD CONSTRAINT "ExcludedIngredient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
