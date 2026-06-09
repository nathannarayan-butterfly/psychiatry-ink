-- Account-linked encrypted backups (zero-knowledge): key + registry ciphertext per user.

CREATE TABLE "AccountKeyBackup" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL DEFAULT 310000,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AccountRegistryBackup" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);
