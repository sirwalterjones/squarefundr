"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="text-center mb-16 animate-fade-in">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Interactive Fundraising
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Made Simple
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Create engaging fundraising campaigns with interactive square
                grids. Supporters can select and purchase squares on your images
                to help reach your goals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/create"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Create Your Campaign
                </Link>
                <Link
                  href="/fundraiser/team-championship-fund"
                  className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all duration-200"
                >
                  Try Live Demo
                </Link>
              </div>
            </div>

            {/* Visual Example */}
            <div className="relative max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="relative">
                {/* Sports Image */}
                <img
                  src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=300&fit=crop&auto=format"
                  alt="Football Field - Fundraising Example"
                  className="w-full h-64 object-cover"
                />

                {/* Grid Overlay Demo */}
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-8 gap-1 p-2">
                  {/* Sample squares */}
                  {Array.from({ length: 80 }, (_, i) => (
                    <div
                      key={i}
                      className={`
                        rounded-sm border transition-all duration-200 flex items-center justify-center text-xs font-bold
                        ${
                          i < 12
                            ? "bg-red-500 bg-opacity-60 border-red-400 text-white" // Claimed squares
                            : i < 20
                              ? "bg-blue-500 bg-opacity-60 border-blue-400 text-white" // Selected squares
                              : "bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-opacity-30 cursor-pointer"
                        }
                      `}
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Demo Legend */}
                <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 rounded-lg p-2 text-xs text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>Claimed</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span>Selected</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-white bg-opacity-40 rounded"></div>
                        <span>Available</span>
                      </div>
                    </div>
                    <span className="font-semibold">$5-$50</span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  Football Team Championship Fund
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>12/80 squares claimed</span>
                  <span className="font-semibold text-green-600">
                    $340 raised
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: "15%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How SquareFundr Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three simple steps to launch your interactive fundraising campaign
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Upload & Configure
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Upload your campaign image and set up your grid. Choose from
                flexible pricing options that work best for your fundraising
                goals.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Share Your Campaign
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Get a beautiful, shareable link. Supporters can easily view your
                campaign and select squares to contribute to your cause.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
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
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Start Fundraising?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
            Join thousands of successful fundraisers who have raised millions
            using SquareFundr
          </p>
          <Link
            href="/create"
            className="inline-block bg-white text-blue-600 px-12 py-4 rounded-xl font-bold text-xl hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-xl"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
