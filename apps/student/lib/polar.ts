import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    server: process.env.NODE_ENV === "development" ? "sandbox" : "production",
});

export const POLAR_ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID;
