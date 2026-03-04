import { createHash } from "crypto";
import { NextResponse } from "next/server";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }

  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) {
    return null;
  }

  const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) {
    return null;
  }

  return {
    apiKey: match[1],
    apiSecret: match[2],
    cloudName: match[3],
  };
}

export async function POST(request: Request) {
  try {
    const cfg = getCloudinaryConfig();
    if (!cfg) {
      return NextResponse.json(
        {
          error:
            "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "receipts";
    const signatureBase = `folder=${folder}&timestamp=${timestamp}${cfg.apiSecret}`;
    const signature = createHash("sha1").update(signatureBase).digest("hex");

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("folder", folder);
    cloudinaryForm.append("api_key", cfg.apiKey);
    cloudinaryForm.append("timestamp", String(timestamp));
    cloudinaryForm.append("signature", signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`;
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: cloudinaryForm,
    });

    if (!uploadRes.ok) {
      const errorBody = await uploadRes.text();
      return NextResponse.json(
        { error: `Cloudinary upload failed: ${errorBody}` },
        { status: 502 }
      );
    }

    const payload = await uploadRes.json();
    return NextResponse.json({
      secureUrl: payload.secure_url as string,
      publicId: payload.public_id as string,
      originalFilename: payload.original_filename as string,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Upload error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
