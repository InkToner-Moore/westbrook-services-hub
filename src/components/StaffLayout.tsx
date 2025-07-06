import { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import StaffHeader from "./StaffHeader";

interface StaffLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  backTo?: string;
  backLabel?: string;
}

const StaffLayout = ({ 
  children, 
  title, 
  subtitle, 
  icon, 
  iconColor, 
  backTo, 
  backLabel 
}: StaffLayoutProps) => {
  const { themeClasses } = useTheme();

  return (
    <div className={`min-h-screen transition-all duration-500 ${themeClasses.background}`}>
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse transition-all duration-500 ${themeClasses.backgroundFloating.purple}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000 transition-all duration-500 ${themeClasses.backgroundFloating.blue}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500 transition-all duration-500 ${themeClasses.backgroundFloating.indigo}`}></div>
      </div>

      <StaffHeader 
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconColor={iconColor}
        backTo={backTo}
        backLabel={backLabel}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </main>
    </div>
  );
};

export default StaffLayout;