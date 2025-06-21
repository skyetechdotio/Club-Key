import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import golfBallLogo from "@/assets/new-logo.svg";

export default function Footer() {
  return (
    <footer className="bg-neutral-dark text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-heading font-bold text-xl mb-4 flex items-center">
              <img src={golfBallLogo} alt="Linx Golf" className="mr-2 h-7 w-7" /> Linx
            </h3>
            <p className="text-black mb-4">
              Connecting golfers with exclusive clubs through member hosts.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-all">
                <Facebook size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-all">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-all">
                  About Us
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-all">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>
          
        </div>
        
        <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Linx, Inc. All rights reserved. v2
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-white text-sm transition-all">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-gray-400 hover:text-white text-sm transition-all">
              Terms of Service
            </Link>
            <Link href="/cookie-policy" className="text-gray-400 hover:text-white text-sm transition-all">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 