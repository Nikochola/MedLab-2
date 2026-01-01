import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
    accessToken: "polar_oat_IGJiMe31kWVfypNh4TK62pNlaJPKOCVNIhVBQ3ctQXW",
    server: "sandbox", // Assuming sandbox for now, or I'll try production if it fails
});

async function main() {
    try {
        const orgs = await polar.organizations.list({});
        console.log("Organizations:", JSON.stringify(orgs, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
