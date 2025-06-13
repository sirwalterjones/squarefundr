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
      return {
        title: "Football Team Championship Fund - SquareFundr",
        description:
          "Help our high school football team reach the state championship! We need funds for new equipment, travel expenses, and tournament fees. Every square you purchase brings us closer to our goal and supports our student athletes in their pursuit of excellence.",
        openGraph: {
          title: "Football Team Championship Fund",
          description:
            "Help our high school football team reach the state championship! We need funds for new equipment, travel expenses, and tournament fees. Every square you purchase brings us closer to our goal and supports our student athletes in their pursuit of excellence.",
          images: [
            {
              url: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=600&fit=crop",
              width: 800,
              height: 600,
              alt: "Football Team Championship Fund",
            },
          ],
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title: "Football Team Championship Fund",
          description:
            "Help our high school football team reach the state championship! Every square you purchase brings us closer to our goal.",
          images: [
            "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=600&fit=crop",
          ],
        },
      };
    }

    // For real campaigns, fetch from API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://vibrant-lalande2-fd784.view-3.tempo-dev.app"}/api/campaigns/${slug}`,
      {
        cache: "no-store", // Ensure fresh data for metadata
      },
    );

    if (!response.ok) {
      return {
        title: "Campaign Not Found - SquareFundr",
        description:
          "The fundraiser you're looking for doesn't exist or has been removed.",
      };
    }

    const { campaign } = await response.json();

    // Ensure image URL is absolute
    const imageUrl = campaign.image_url
      ? campaign.image_url.startsWith("http")
        ? campaign.image_url
        : `${process.env.NEXT_PUBLIC_SITE_URL || "https://vibrant-lalande2-fd784.view-3.tempo-dev.app"}${campaign.image_url}`
      : "/images/baseball.jpg";

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
            width: 800,
            height: 600,
            alt: campaign.title,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: campaign.title,
        description:
          campaign.description ||
          "Support this fundraiser by purchasing squares!",
        images: [imageUrl],
      },
    };
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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://vibrant-lalande2-fd784.view-3.tempo-dev.app"}/api/campaigns/${slug}`,
      {
        cache: "no-store", // Ensure fresh data
      },
    );

    if (!response.ok) {
      notFound();
    }

    const { campaign, squares } = await response.json();

    return (
      <FundraiserClient
        slug={slug}
        initialCampaign={campaign}
        initialSquares={squares}
      />
    );
  } catch (error) {
    console.error("Error loading campaign:", error);
    notFound();
  }
}
