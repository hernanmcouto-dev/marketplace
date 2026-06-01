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
    const key = `images/${supplier}/${sku}.jpg`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/jpeg",
        ACL: "public-read",
      })
    );

    // Retornar URL pública de S3
    return `https://${BUCKET_NAME}.s3.sa-east-1.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}
