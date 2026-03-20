const fs = require("fs")
const path = require("path")

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue

    const key = match[1]
    if (process.env[key] !== undefined) continue

    let value = match[2] || ""
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

loadEnvFile(path.resolve(__dirname, ".env.local"))
loadEnvFile(path.resolve(__dirname, ".env"))
loadEnvFile(path.resolve(__dirname, "../../.env.local"))
loadEnvFile(path.resolve(__dirname, "../../.env"))

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig
