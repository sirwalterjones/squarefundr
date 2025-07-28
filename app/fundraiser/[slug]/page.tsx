import { Metadata } from "next";
import { notFound } from "next/navigation";
import FundraiserClient from "./FundraiserClient";
import { Campaign, Square } from "@/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for social sharing
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Check if this is the demo campaign
    if (slug === "team-championship-fund") {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.squarefundr.com";
      return {
        title: "Soccer Team Championship Fund - SquareFundr",
        description:
          "Help our high school soccer team reach the state championship! We need funds for new equipment, travel expenses, and tournament fees. Every square you purchase brings us closer to our goal and supports our student athletes in their pursuit of excellence.",
        openGraph: {
          title: "Soccer Team Championship Fund",
          description:
            "Help our high school soccer team reach the state championship! We need funds for new equipment, travel expenses, and tournament fees. Every square you purchase brings us closer to our goal and supports our student athletes in their pursuit of excellence.",
          images: [
            {
              url: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&h=630&fit=crop&auto=format",
              width: 1200,
              height: 630,
              alt: "Soccer Team Championship Fund",
            },
          ],
          type: "website",
          siteName: "SquareFundr",
          locale: "en_US",
          url: `${baseUrl}/fundraiser/${slug}`,
        },
        twitter: {
          card: "summary_large_image",
          title: "Soccer Team Championship Fund",
          description:
            "Help our high school soccer team reach the state championship! Every square you purchase brings us closer to our goal.",
          images: [
            "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&h=630&fit=crop&auto=format",
          ],
        },
        // Additional meta tags for better Facebook/Instagram support
        other: {
          "fb:app_id": "1234567890123456",
          "og:url": `${baseUrl}/fundraiser/${slug}`,
          "og:image":
            "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&h=630&fit=crop&auto=format",
          "og:image:secure_url":
            "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&h=630&fit=crop&auto=format",
          "og:image:width": "1200",
          "og:image:height": "630",
          "og:image:type": "image/jpeg",
          "og:image:alt": "Soccer Team Championship Fund",
          "og:title": "Soccer Team Championship Fund",
          "og:description":
            "Help our high school soccer team reach the state championship! We need funds for new equipment, travel expenses, and tournament fees. Every square you purchase brings us closer to our goal and supports our student athletes in their pursuit of excellence.",
          "og:type": "website",
          "og:site_name": "SquareFundr",
        },
      };
    }

    // For real campaigns, fetch from API
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.squarefundr.com";

    try {
      const response = await fetch(`${baseUrl}/api/campaigns/${slug}`, {
        cache: "no-store", // Ensure fresh data for metadata
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `API fetch failed: ${response.status} ${response.statusText}`,
        );
        throw new Error(`Failed to fetch campaign: ${response.status}`);
      }

      const data = await response.json();
      if (!data.campaign) {
        throw new Error("No campaign data received");
      }

      const { campaign } = data;

      // Use the campaign's image_url directly - it should be a full URL from Supabase storage
      const imageUrl =
        campaign.image_url ||
        "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&h=630&fit=crop&auto=format";

      console.log("Campaign image URL for metadata:", imageUrl);
      console.log("Full campaign data:", campaign);
      console.log("Base URL being used:", baseUrl);

      const pageUrl = `${baseUrl}/fundraiser/${slug}`;

      return {
        title: `${campaign.title} - SquareFundr`,
        description:
          campaign.description ||
          "Support this fundraiser by purchasing squares!",
        openGraph: {
          title: campaign.title,
          description:
            campaign.description ||
            "Support this fundraiser by purchasing squares!",
          images: [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: campaign.title,
            },
          ],
          url: pageUrl,
          type: "website",
          siteName: "SquareFundr",
          locale: "en_US",
        },
        twitter: {
          card: "summary_large_image",
          title: campaign.title,
          description:
            campaign.description ||
            "Support this fundraiser by purchasing squares!",
          images: [imageUrl],
        },
        // Additional meta tags for better Facebook/Instagram support
        other: {
          "fb:app_id": "1234567890123456",
          "og:url": pageUrl,
          "og:image": imageUrl,
          "og:image:secure_url": imageUrl,
          "og:image:width": "1200",
          "og:image:height": "630",
          "og:image:type": "image/jpeg",
          "og:image:alt": campaign.title,
          "og:title": campaign.title,
          "og:description":
            campaign.description ||
            "Support this fundraiser by purchasing squares!",
          "og:type": "website",
          "og:site_name": "SquareFundr",
        },
      };
    } catch (error) {
      console.error("Error fetching campaign for metadata:", error);
      return {
        title: "Fundraiser - SquareFundr",
        description: "Support this fundraiser by purchasing squares!",
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Fundraiser - SquareFundr",
      description: "Support this fundraiser by purchasing squares!",
    };
  }
}

// Server component that fetches data and passes to client component
export default async function FundraiserPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    // Check if this is the demo campaign
    if (slug === "team-championship-fund") {
      // For demo, we'll let the client component handle the data
      return <FundraiserClient slug={slug} />;
    }

    // For real campaigns, fetch server-side
    const serverBaseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.squarefundr.com";

    try {
      const response = await fetch(`${serverBaseUrl}/api/campaigns/${slug}`, {
        cache: "no-store", // Ensure fresh data
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `Failed to fetch campaign: ${response.status} ${response.statusText}`,
        );
        // Instead of notFound(), let client handle the loading
        return <FundraiserClient slug={slug} />;
      }

      const data = await response.json();
      if (!data.campaign) {
        console.error("No campaign data received from API");
        return <FundraiserClient slug={slug} />;
      }

      const { campaign, squares } = data;

      return (
        <FundraiserClient
          slug={slug}
          initialCampaign={campaign}
          initialSquares={squares}
        />
      );
    } catch (error) {
      console.error("Error in server-side campaign fetch:", error);
      // Let client handle the loading and error states
      return <FundraiserClient slug={slug} />;
    }
  } catch (error) {
    console.error("Error loading campaign:", error);
    notFound();
  }
}
