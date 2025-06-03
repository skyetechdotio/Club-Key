import { AvatarProps, Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AvatarGroupProps = {
  items: {
    image?: string;
    name?: string;
    initials?: string;
  }[];
  limit?: number;
  size?: "sm" | "md" | "lg";
  containerClassName?: string;
};

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export function AvatarGroup({ 
  items, 
  limit = 3, 
  size = "md",
  containerClassName 
}: AvatarGroupProps) {
  const sizeClass = sizeClasses[size];
  const visibleAvatars = items.slice(0, limit);
  const remainingCount = items.length - limit;

  return (
    <div className={cn("flex -space-x-2", containerClassName)}>
      {visibleAvatars.map((item, i) => (
        <Avatar key={i} className={cn(sizeClass, "border-2 border-background")}>
          {item.image ? (
            <AvatarImage src={item.image} alt={item.name || `User ${i + 1}`} />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground">
              {item.initials || 
                (item.name ? item.name.substring(0, 2).toUpperCase() : "U")}
            </AvatarFallback>
          )}
        </Avatar>
      ))}
      
      {remainingCount > 0 && (
        <div 
          className={cn(
            sizeClass,
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground border-2 border-background"
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
