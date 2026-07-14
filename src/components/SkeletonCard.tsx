import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";

interface SkeletonCardProps {
  variant?: "default" | "compact" | "list";
  count?: number;
}

const SkeletonCard = ({ variant = "default", count = 1 }: SkeletonCardProps) => {
  const { themeClasses, isDarkMode } = useTheme();

  // Placeholder fill, tinted to sit just off the card it's drawn on.
  const skeletonFill = isDarkMode ? "bg-slate-700" : "bg-slate-200";

  const SkeletonLine = ({ width = "w-full", height = "h-4" }: { width?: string; height?: string }) => (
    <div className={`${width} ${height} rounded animate-pulse transition-all duration-500 ${skeletonFill}`}></div>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case "compact":
        return (
          <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.primary}`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl animate-pulse ${skeletonFill}`}></div>
                <div className="flex-1 space-y-2">
                  <SkeletonLine width="w-3/4" />
                  <SkeletonLine width="w-1/2" height="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "list":
        return (
          <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.primary}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`w-8 h-8 rounded-full animate-pulse ${skeletonFill}`}></div>
                  <div className="flex-1 space-y-2">
                    <SkeletonLine width="w-2/3" />
                    <SkeletonLine width="w-1/3" height="h-3" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className={`w-8 h-8 rounded animate-pulse ${skeletonFill}`}></div>
                  <div className={`w-8 h-8 rounded animate-pulse ${skeletonFill}`}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.primary}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-xl animate-pulse ${skeletonFill}`}></div>
                  <div className="space-y-2">
                    <SkeletonLine width="w-32" />
                    <SkeletonLine width="w-24" height="h-3" />
                  </div>
                </div>
                <div className={`w-16 h-6 rounded-full animate-pulse ${skeletonFill}`}></div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <SkeletonLine />
                <SkeletonLine width="w-4/5" />
                <SkeletonLine width="w-3/5" />
                <div className="flex justify-between items-center pt-2">
                  <SkeletonLine width="w-20" height="h-3" />
                  <SkeletonLine width="w-16" height="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;