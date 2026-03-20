/**
 * MEDLAB: Chest CT-Scan Ingestion Script (Kaggle)
 * 
 * This script automates downloading the Chest CT-Scan dataset and uploading it to Cloudflare R2.
 * 
 * Usage:
 * npx tsx apps/web/scripts/ingest-chest-ct.ts --download
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { execSync } from "child_process";

// Configuration
let DATASET_ROOT = "./chest_ct_scan";

// Process arguments
const pathArg = process.argv.indexOf("--path");
if (pathArg !== -1 && process.argv[pathArg + 1]) {
    DATASET_ROOT = process.argv[pathArg + 1];
}

const downloadArg = process.argv.indexOf("--download") !== -1;
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : Infinity;

// Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME || "medlab-xray";

if (!supabaseUrl || !supabaseKey || !r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    console.error("❌ Missing required environment variables.");
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
    console.log("📥 Attempting to download Chest CT-Scan images dataset...");
    try {
        const env = { ...process.env };
        if (!fs.existsSync(DATASET_ROOT)) fs.mkdirSync(DATASET_ROOT, { recursive: true });

        console.log("⚡ Starting download (mohamedhanyyy/chest-ctscan-images)...");
        execSync(`kaggle datasets download -d mohamedhanyyy/chest-ctscan-images --unzip -p ${DATASET_ROOT}`, {
            stdio: "inherit",
            env
        });
        console.log("✅ Download and unzip complete.");
    } catch (error) {
        console.error("❌ Kaggle download failed.");
        process.exit(1);
    }
}

async function walk(dir: string): Promise<string[]> {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return [];
    const list = await promisify(fs.readdir)(dir);
    for (const file of list) {
        if (file === "__MACOSX" || file.startsWith("._")) continue;
        const fullPath = path.join(dir, file);
        const stat = await promisify(fs.stat)(fullPath);
        if (stat && stat.isDirectory()) {
            files.push(...(await walk(fullPath)));
        } else {
            if (file.toLowerCase().endsWith(".png") || file.toLowerCase().endsWith(".jpg")) {
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

    console.log(`🚀 Starting CT Ingestion from: ${DATASET_ROOT}`);
    const allFiles = await walk(DATASET_ROOT);
    console.log(`📂 Found ${allFiles.length} images.`);

    const filesToProcess = allFiles.slice(0, LIMIT);
    console.log(`⚡ Processing ${filesToProcess.length} images...`);

    let success = 0;
    let failed = 0;

    for (const filePath of filesToProcess) {
        try {
            const fileName = path.basename(filePath);
            const relativePath = path.relative(DATASET_ROOT, filePath);
            const r2Key = `ct/chest-adult/${relativePath.replace(/\\/g, "/")}`;

            // 1. Check if already exists
            const { data: existing } = await supabase
                .from("xray_training_images")
                .select("id")
                .eq("storage_path", r2Key)
                .single();

            if (existing) {
                success++;
                continue;
            }

            // 2. Upload to R2
            const fileBuffer = fs.readFileSync(filePath);
            await s3.send(new PutObjectCommand({
                Bucket: r2BucketName,
                Key: r2Key,
                Body: fileBuffer,
                ContentType: "image/png",
            }));

            // 3. Determine label from path
            let label = "normal";
            if (relativePath.toLowerCase().includes("adenocarcinoma")) label = "adenocarcinoma";
            else if (relativePath.toLowerCase().includes("large.cell.carcinoma")) label = "large_cell_carcinoma";
            else if (relativePath.toLowerCase().includes("squamous.cell.carcinoma")) label = "squamous_cell_carcinoma";

            // 4. Insert into Supabase
            const { error: dbError } = await supabase.from("xray_training_images").insert({
                storage_path: r2Key,
                storage_provider: "r2",
                modality: "CT",
                age_group: "ADULT",
                label: label,
                dataset_source: "chest-ctscan-images",
                metadata: {
                    original_filename: fileName,
                    ingested_at: new Date().toISOString()
                }
            });

            if (dbError) throw dbError;

            success++;
            if (success % 10 === 0) console.log(`✅ Progress: ${success}/${filesToProcess.length}`);
        } catch (error) {
            console.error(`❌ Failed to process ${filePath}:`, error);
            failed++;
        }
    }

    console.log(`\n🎉 CT Ingestion Complete!`);
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);
}

main().catch(console.error);
