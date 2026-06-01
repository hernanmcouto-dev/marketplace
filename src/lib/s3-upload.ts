import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3Client = new S3Client({
  region: "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = "planetaonceimagenes-519120507391-sa-east-1-an";

export async function uploadImageToS3(
  imageBuffer: Buffer,
  sku: string,
  supplier: string
): Promise<string> {
  try {
    console.log(`[S3] Uploading ${sku} (${imageBuffer.length} bytes)`);
    console.log(`[S3] AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? "SET" : "NOT SET"}`);
    console.log(`[S3] AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "NOT SET"}`);

    const key = `images/${supplier}/${sku}.jpg`;

    const result = await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/jpeg",
      })
    );

    console.log(`[S3] Upload successful for ${sku}`);

    // Retornar URL pública de S3
    return `https://${BUCKET_NAME}.s3.sa-east-1.amazonaws.com/${key}`;
  } catch (error) {
    console.error("[S3] Error uploading to S3:", error);
    throw error;
  }
}
