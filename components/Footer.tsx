import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-gray-800 mt-auto">
      <div className="container-responsive py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2 text-gray-300">
            <span>Made with</span>
            <span className="text-white text-lg">❤️</span>
            <span>by</span>
            <a 
              href="https://joneswebdesigns.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors font-medium"
            >
              Jones Web Designs
            </a>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-400">
            <span>© 2024 SquareFundr. All rights reserved.</span>
            <Link 
              href="/privacy" 
              className="text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 