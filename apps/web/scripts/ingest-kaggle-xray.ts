/**
 * MEDLAB: Kaggle Chest X-Ray Ingestion Script (Cloudflare R2 version)
 * 
 * This script automates downloading the Kaggle dataset and uploading it to Cloudflare R2.
 * 
 * Usage:
 * node --env-file=.env.local apps/web/scripts/ingest-kaggle-xray.ts --download
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { execSync } from "child_process";

// Configuration
let DATASET_ROOT = "./chest_xray";

// Process arguments
const pathArg = process.argv.indexOf("--path");
if (pathArg !== -1 && process.argv[pathArg + 1]) {
    DATASET_ROOT = process.argv[pathArg + 1];
}

const downloadArg = process.argv.indexOf("--download") !== -1;

// Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME || "medlab-xray";

if (!supabaseUrl || !supabaseKey || !r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    console.error("❌ Missing required environment variables. Check .env.local for R2 and Supabase keys.");
    process.exit(1);
}

// Clients
const supabase = createClient(supabaseUrl, supabaseKey);
const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
    },
});

async function downloadDataset() {
    console.log("📥 Attempting to download dataset via Kaggle API...");
    try {
        // Ensure KAGGLE_API_TOKEN or other keys are passed to the shell
        const env = { ...process.env };

        execSync("kaggle --version", { stdio: "ignore", env });
        console.log("⚡ Found Kaggle CLI. Starting download (paultimothymooney/chest-xray-pneumonia)...");
        if (!fs.existsSync(DATASET_ROOT)) fs.mkdirSync(DATASET_ROOT, { recursive: true });

        execSync(`kaggle datasets download -d paultimothymooney/chest-xray-pneumonia --unzip -p ${DATASET_ROOT}`, {
            stdio: "inherit",
            env
        });
        console.log("✅ Download and unzip complete.");
    } catch (error) {
        console.error("❌ Kaggle CLI not found or download failed. Ensure 'pip install kaggle' is run and ~/.kaggle/kaggle.json exists.");
        process.exit(1);
    }
}

async function walk(dir: string): Promise<string[]> {
    const files: string[] = [];
    const list = await promisify(fs.readdir)(dir);
    for (const file of list) {
        if (file === "__MACOSX" || file.startsWith("._")) continue;
        const fullPath = path.join(dir, file);
        const stat = await promisify(fs.stat)(fullPath);
        if (stat && stat.isDirectory()) {
            files.push(...(await walk(fullPath)));
        } else {
            if (file.toLowerCase().endsWith(".jpeg") || file.toLowerCase().endsWith(".jpg")) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

async function main() {
    if (downloadArg) {
        await downloadDataset();
    }

    console.log(`🚀 Starting ingestion from: ${DATASET_ROOT}`);
    if (!fs.existsSync(DATASET_ROOT)) {
        console.error(`❌ Dataset root not found: ${DATASET_ROOT}`);
        process.exit(1);
    }

    const allFiles = await walk(DATASET_ROOT);
    console.log(`📂 Found ${allFiles.length} images.`);

    // For R2, we can do more since it's 10GB free. 
    // We'll process up to 10,000 images if available (the dataset is around 5.8k images).
    const filesToProcess = allFiles;
    console.log(`⚡ Uploading to Cloudflare R2...`);

    let success = 0;
    let failed = 0;

    for (const filePath of filesToProcess) {
        try {
            const fileName = path.basename(filePath);
            const relativePath = path.relative(DATASET_ROOT, filePath);
            const label = relativePath.toUpperCase().includes("NORMAL") ? "normal" : "pneumonia";

            let subLabel: "bacterial" | "viral" | null = null;
            if (label === "pneumonia") {
                if (fileName.toLowerCase().includes("bacteria")) subLabel = "bacterial";
                else if (fileName.toLowerCase().includes("virus")) subLabel = "viral";
            }

            const fileBuffer = fs.readFileSync(filePath);
            const r2Key = `xray/${relativePath.replace(/\\/g, "/")}`;

            // 1. Check if already exists to save time/bandwidth
            const { data: existing } = await supabase
                .from("xray_training_images")
                .select("id")
                .eq("storage_path", r2Key)
                .single();

            if (existing) {
                // console.log(`⏭️ Skipping ${fileName} (already exists)`);
                success++;
                if (success % 100 === 0) console.log(`✅ Progress: ${success}/${filesToProcess.length}`);
                continue;
            }

            // 2. Upload to R2
            await s3.send(new PutObjectCommand({
                Bucket: r2BucketName,
                Key: r2Key,
                Body: fileBuffer,
                ContentType: "image/jpeg",
            }));

            // 3. Insert into Supabase
            const { error: dbError } = await supabase.from("xray_training_images").insert({
                storage_path: r2Key,
                storage_provider: "r2",
                label: label,
                sub_label: subLabel,
                dataset_source: "kaggle-pneumonia",
                metadata: {
                    original_filename: fileName,
                    ingested_at: new Date().toISOString()
                }
            });

            if (dbError) throw dbError;

            success++;
            if (success % 100 === 0) console.log(`✅ Progress: ${success}/${filesToProcess.length}`);
        } catch (error) {
            console.error(`❌ Failed to process ${filePath}:`, error);
            failed++;
        }
    }

    console.log(`\n🎉 Ingestion Complete!`);
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);
}

main().catch(console.error);
