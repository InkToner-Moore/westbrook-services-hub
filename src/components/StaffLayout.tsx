import { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useShell } from "@/components/shell/ShellContext";
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
  backLabel,
}: StaffLayoutProps) => {
  const { themeClasses } = useTheme();
  const { inShell } = useShell();

  // Inside the staff shell the rail already provides navigation and identity, so
  // the tool renders as content only: no page header, no full-height background,
  // no back button. A thin title bar keeps the tool legible in the center pane.
  if (inShell) {
    const Icon = icon;
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          {Icon && (
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${themeClasses.card.secondary}`}>
              <Icon className={`h-5 w-5 ${iconColor ?? themeClasses.text.secondary}`} />
            </span>
          )}
          <div>
            <h1 className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>{title}</h1>
            {subtitle && <p className={`text-sm ${themeClasses.text.secondary}`}>{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    );
  }

  // Standalone (deep-linked) full page.
  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <StaffHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconColor={iconColor}
        backTo={backTo}
        backLabel={backLabel}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </main>
    </div>
  );
};

export default StaffLayout;
