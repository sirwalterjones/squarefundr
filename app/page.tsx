"use client";

import Link from "next/link";
import GridOverlay from "@/components/GridOverlay";
import { Campaign, Square, SelectedSquare } from "@/types";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [selectedSquares, setSelectedSquares] = useState<SelectedSquare[]>([]);
  const [campaigns, setCampaigns] = useState(15);
  const [moneyRaised, setMoneyRaised] = useState(1500);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load real campaign and donation data
  useEffect(() => {
    setIsLoaded(true);
    
    const loadRealData = async () => {
      try {
        console.log('📊 Loading live campaign statistics...');
        
        // Fetch real data from public stats endpoint
        const response = await fetch('/api/public-stats', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            const { totalCampaigns, totalRaised } = data.stats;
            
            console.log(`✅ Loaded live stats: ${totalCampaigns} campaigns, $${totalRaised} raised`);
            
            // Use real data with a minimum baseline for presentation
            const displayCampaigns = Math.max(15, totalCampaigns);
            const displayRaised = Math.max(1500, totalRaised + 1500); // Add baseline for presentation
            
            // Animate to real numbers with a short delay for visual effect
            setTimeout(() => {
              setCampaigns(displayCampaigns);
              setMoneyRaised(displayRaised);
            }, 800);
          } else {
            console.warn('Invalid response from public stats API');
            // Keep defaults if API response is invalid
          }
        } else {
          console.error('Failed to fetch public stats:', response.status, response.statusText);
          // Keep defaults if API fails
        }

      } catch (error) {
        console.error('Error loading live data:', error);
        // Keep defaults if there's an error
      }
    };

    loadRealData();

    // Set up interval to refresh data every 30 seconds for live updates
    const interval = setInterval(loadRealData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mock campaign data for the interactive demo
  const mockCampaign: Campaign = {
    id: "demo-campaign",
    user_id: "demo-user",
    title: "Soccer Team Championship Fund",
    description:
      "Help our soccer team reach the championship! We need funds for new equipment, travel expenses, and tournament fees. Every square you purchase brings us closer to our goal and supports our student athletes in their pursuit of excellence.",
    image_url: "/images/football.jpg",
    rows: 8,
    columns: 10,
    pricing_type: "sequential",
    price_data: {
      sequential: {
        start: 5,
        increment: 5,
      },
    },
    public_url: "demo-url",
    slug: "demo-slug",
    created_at: new Date().toISOString(),
    paid_to_admin: false,
    is_active: true,
  };

  // Mock squares data with some pre-claimed squares
  const mockSquares: Square[] = Array.from({ length: 80 }, (_, index) => {
    const row = Math.floor(index / 10);
    const col = index % 10;
    const number = index + 1;
    const isClaimed = index < 12; // First 12 squares are claimed

    return {
      id: `square-${index}`,
      campaign_id: "demo-campaign",
      row,
      col,
      number,
      value: 5 + index * 5,
      claimed_by: isClaimed ? `donor-${index}` : undefined,
      donor_name: isClaimed ? `Donor ${index + 1}` : undefined,
      payment_status: isClaimed ? "completed" : "pending",
      payment_type: "stripe",
      claimed_at: isClaimed ? new Date().toISOString() : undefined,
    };
  });

  // Visual-only handlers (for demo purposes only)
  const handleSquareSelect = (square: SelectedSquare) => {
    setSelectedSquares((prev) => {
      // Don't select if already claimed
      const existingSquare = mockSquares.find(
        (s) => s.number === square.number,
      );
      if (existingSquare?.claimed_by) return prev;

      // Don't select if already selected
      if (prev.find((s) => s.number === square.number)) return prev;

      return [...prev, square];
    });
  };

  const handleSquareDeselect = (square: SelectedSquare) => {
    setSelectedSquares((prev) =>
      prev.filter((s) => s.number !== square.number),
    );
  };

  // Animated counter component
  const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      if (!isLoaded) return;
      
      const startValue = displayValue;
      const endValue = value;
      const duration = 2000; // 2 seconds
      const increment = (endValue - startValue) / (duration / 16); // 60 FPS

      let current = startValue;
      const timer = setInterval(() => {
        current += increment;
        if (current >= endValue) {
          setDisplayValue(endValue);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, 16);

      return () => clearInterval(timer);
    }, [value, isLoaded]);

    return (
      <span className="tabular-nums">
        {prefix}{displayValue.toLocaleString()}{suffix}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="text-center mb-16 animate-fade-in">
              {/* SquareFundr Logo */}
              <div className="flex items-center justify-center mb-12">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-black rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-200 shadow-xl">
                  <span className="text-white font-bold text-4xl md:text-5xl">SF</span>
                </div>
                <span className="ml-6 text-5xl md:text-7xl font-bold text-black">
                  SquareFundr
                </span>
              </div>
              
              {/* Main Heading with Side Counters */}
              <div className="relative mb-6">
                <div className="hidden lg:flex items-center justify-between w-full max-w-6xl mx-auto">
                  
                  {/* Left Counter - Campaigns */}
                  <div className="flex-shrink-0 group">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                      <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 rounded-xl shadow-lg">
                        <div className="text-2xl xl:text-4xl font-bold mb-1">
                          <AnimatedCounter value={campaigns} />
                        </div>
                        <div className="text-xs xl:text-sm font-medium uppercase tracking-wider">
                          Active Campaigns
                        </div>
                      </div>
                    </div>
                    {/* Live indicator for left counter */}
                    <div className="flex items-center justify-center mt-2">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium">Live</span>
                      </div>
                    </div>
                  </div>

                  {/* Center - Main Heading */}
                  <div className="flex-1 text-center mx-8">
                    <h1 className="text-4xl xl:text-6xl font-bold text-black">
                      Interactive Fundraising
                      <span className="block text-black">
                        Made Simple
                      </span>
                    </h1>
                  </div>

                  {/* Right Counter - Money Raised */}
                  <div className="flex-shrink-0 group">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                      <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg">
                        <div className="text-2xl xl:text-4xl font-bold mb-1">
                          <AnimatedCounter value={moneyRaised} prefix="$" />
                        </div>
                        <div className="text-xs xl:text-sm font-medium uppercase tracking-wider">
                          Total Raised
                        </div>
                      </div>
                    </div>
                    {/* Live indicator for right counter */}
                    <div className="flex items-center justify-center mt-2">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium">Live</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Mobile/Tablet Layout - Stacked */}
                <div className="lg:hidden">
                  <h1 className="text-4xl md:text-6xl font-bold text-black mb-8">
                    Interactive Fundraising
                    <span className="block text-black">
                      Made Simple
                    </span>
                  </h1>
                  
                  {/* Mobile Stats */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
                    <div className="text-center group">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                        <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 rounded-xl shadow-lg">
                          <div className="text-3xl font-bold mb-2">
                            <AnimatedCounter value={campaigns} />
                          </div>
                          <div className="text-sm font-medium uppercase tracking-wider">
                            Active Campaigns
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center group">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                        <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg">
                          <div className="text-3xl font-bold mb-2">
                            <AnimatedCounter value={moneyRaised} prefix="$" />
                          </div>
                          <div className="text-sm font-medium uppercase tracking-wider">
                            Total Raised
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Live indicator */}
                  <div className="flex items-center justify-center mt-4">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Live Stats</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Create engaging fundraising campaigns with interactive square
                grids. Supporters can select and purchase squares on your images
                to help reach your goals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link
                  href="/create"
                  className="bg-black text-white px-8 py-4 rounded-full font-medium hover:bg-gray-900 transition-all duration-200 shadow-sm"
                >
                  Create Your Campaign
                </Link>
                <Link
                  href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/fundraiser/team-championship-fund`}
                  className="border-2 border-black text-black px-8 py-4 rounded-full font-medium hover:bg-black hover:text-white transition-all duration-200"
                >
                  Try Live Demo
                </Link>
              </div>
            </div>

            {/* Interactive Visual Example */}
            <div className="relative max-w-2xl mx-auto bg-white rounded-lg border border-gray-200 overflow-hidden shadow-lg">
              <div className="relative">
                <GridOverlay
                  campaign={mockCampaign}
                  squares={mockSquares}
                  selectedSquares={selectedSquares}
                  onSquareSelect={handleSquareSelect}
                  onSquareDeselect={handleSquareDeselect}
                  imageUrl="https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&h=600&fit=crop&auto=format"
                />

                {/* Demo Legend */}
                <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 text-sm text-black border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                        <span>Claimed</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span>Selected</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
                        <span>Available</span>
                      </div>
                    </div>
                    <span className="font-medium">$5-$400</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-bold text-black mb-3 text-lg">
                  Soccer Team Championship Fund
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <span>12/80 squares claimed</span>
                  <span className="font-medium text-green-600 text-lg">
                    $2,340 raised
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: "15%" }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ✨ Try hovering over the squares above! (Demo only - no actual
                  purchases)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
              How SquareFundr Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three simple steps to launch your interactive fundraising campaign
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-10 h-10 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">
                Upload & Configure
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Upload your campaign image and set up your grid. Choose from
                flexible pricing options that work best for your fundraising
                goals.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-10 h-10 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">
                Share Your Campaign
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Get a beautiful, shareable link. Supporters can easily view your
                campaign and select squares to contribute to your cause.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-10 h-10 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">
                Collect Donations
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Accept secure online payments or cash donations. Track your
                progress in real-time with our comprehensive dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Ready to Start Fundraising?
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Join thousands of successful fundraisers who have raised millions
            using SquareFundr
          </p>
          <Link
            href="/create"
            className="inline-block bg-black text-white px-12 py-4 rounded-full font-medium text-xl hover:bg-gray-900 transform hover:scale-105 transition-all duration-200"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
