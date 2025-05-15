import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User, MessageSquare, Calendar, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import golfBallLogo from "@/assets/new-logo.svg";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout, openAuthModal, isAuthenticated, refreshUserData } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | undefined>(user?.profileImage);
  
  // Update local state when user data changes
  useEffect(() => {
    if (user) {
      setUserAvatar(user.profileImage);
    }
  }, [user?.profileImage, user?.id]);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user?.username?.substring(0, 2).toUpperCase() || "U";
  };

  // Helper function to handle Host Your Club click
  const handleHostYourClubClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      openAuthModal("register");
      return false;
    }
    return true;
  };

  const navLinks = [
    { name: "Find Tee Times", href: "/tee-times" },
    { 
      name: "Host Your Club", 
      href: user?.isHost ? "/create-listing" : "/dashboard",
      onClick: handleHostYourClubClick
    }
  ];

  return (
    <nav className="bg-white shadow sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-primary font-heading font-bold text-2xl flex items-center">
              <img src={golfBallLogo} alt="Linx Golf" className="mr-2 h-8 w-8" /> Linx
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name}
                href={link.href} 
                className="text-neutral-medium hover:text-primary font-medium transition-all"
                onClick={link.onClick}
              >
                {link.name}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center space-x-2">
                <NotificationPanel />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 border rounded-full py-1.5 px-3 shadow-sm hover:shadow transition-all">
                      <Menu className="h-4 w-4 text-neutral-medium" />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userAvatar} alt={user.username} />
                        <AvatarFallback className="bg-primary text-white">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm font-medium">
                      {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user.id}`} className="cursor-pointer w-full">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer w-full">
                        <Calendar className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/messages" className="cursor-pointer w-full">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Messages
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/notifications" className="cursor-pointer w-full">
                        <Bell className="mr-2 h-4 w-4" />
                        Notifications
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={() => openAuthModal("login")} 
                  variant="ghost" 
                  className="text-neutral-dark hover:text-primary transition-all"
                >
                  Log in
                </Button>
                <Button 
                  onClick={() => openAuthModal("register")} 
                  variant="default" 
                  className="bg-primary hover:bg-primary/90 text-white font-medium rounded-full px-6"
                >
                  Sign up
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="p-2">
                  <Menu className="h-6 w-6 text-neutral-medium" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-6 mt-8">
                  <Link 
                    href="/"
                    className="text-xl font-semibold text-primary flex items-center"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <img src={golfBallLogo} alt="Linx Golf" className="mr-2 h-7 w-7" /> Linx
                  </Link>
                  
                  {navLinks.map((link) => (
                    <Link 
                      key={link.name}
                      href={link.href} 
                      className="text-lg text-neutral-dark hover:text-primary transition-all"
                      onClick={(e) => {
                        if (link.onClick) {
                          const shouldContinue = link.onClick(e);
                          if (!shouldContinue) return;
                        }
                        setIsSheetOpen(false);
                      }}
                    >
                      {link.name}
                    </Link>
                  ))}
                  
                  {user ? (
                    <>
                      <div className="flex items-center space-x-3 py-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={userAvatar} alt={user.username} />
                          <AvatarFallback className="bg-primary text-white">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                          </p>
                          <p className="text-sm text-neutral-medium">{user.email}</p>
                        </div>
                      </div>
                      <Link 
                        href={`/profile/${user.id}`} 
                        className="text-lg text-neutral-dark hover:text-primary transition-all flex items-center"
                        onClick={() => setIsSheetOpen(false)}
                      >
                        <User className="mr-2 h-5 w-5" />
                        Profile
                      </Link>
                      <Link 
                        href="/dashboard" 
                        className="text-lg text-neutral-dark hover:text-primary transition-all flex items-center"
                        onClick={() => setIsSheetOpen(false)}
                      >
                        <Calendar className="mr-2 h-5 w-5" />
                        Dashboard
                      </Link>
                      <Link 
                        href="/messages" 
                        className="text-lg text-neutral-dark hover:text-primary transition-all flex items-center"
                        onClick={() => setIsSheetOpen(false)}
                      >
                        <MessageSquare className="mr-2 h-5 w-5" />
                        Messages
                      </Link>
                      <Link 
                        href="/notifications" 
                        className="text-lg text-neutral-dark hover:text-primary transition-all flex items-center"
                        onClick={() => setIsSheetOpen(false)}
                      >
                        <Bell className="mr-2 h-5 w-5" />
                        Notifications
                      </Link>
                      <Button 
                        onClick={() => {
                          logout();
                          setIsSheetOpen(false);
                        }} 
                        variant="outline" 
                        className="w-full justify-start"
                      >
                        <LogOut className="mr-2 h-5 w-5" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <Button 
                        onClick={() => {
                          openAuthModal("login");
                          setIsSheetOpen(false);
                        }}
                        variant="outline"
                      >
                        Log in
                      </Button>
                      <Button 
                        onClick={() => {
                          openAuthModal("register");
                          setIsSheetOpen(false);
                        }} 
                        variant="default"
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        Sign up
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
