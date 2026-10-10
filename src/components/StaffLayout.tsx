import { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useShell } from "@/components/shell/ShellContext";
import StaffHeader from "./StaffHeader";
import { ToolPage, type ToolKey } from "@/components/shell/ToolPage";

interface StaffLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  backTo?: string;
  backLabel?: string;
  tool?: ToolKey;
  tabs?: ReactNode;
  actions?: ReactNode;
}

const StaffLayout = ({
  children,
  title,
  subtitle,
  icon,
  iconColor,
  backTo,
  backLabel,
  tool,
  tabs,
  actions,
}: StaffLayoutProps) => {
  const { themeClasses } = useTheme();
  const { inShell } = useShell();

  // Inside the staff shell the rail already provides navigation and identity, so
  // the tool renders as content only: no page header, no full-height background,
  // no back button. A thin title bar keeps the tool legible in the center pane.
  if (inShell && tool) {
    return (
      <ToolPage tool={tool} subtitle={subtitle} tabs={tabs} actions={actions}>
        {children}
      </ToolPage>
    );
  }

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
            <h1 className={`font-display text-[28px] font-semibold leading-tight text-pub-ink sm:text-[32px]`}>{title}</h1>
            {subtitle && <p className={`text-sm ${themeClasses.text.secondary}`}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="mb-5 flex flex-wrap gap-2">{actions}</div>}
        {tabs && <div className="mb-5">{tabs}</div>}
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
        {actions && <div className="mb-5 flex flex-wrap gap-2">{actions}</div>}
        {tabs && <div className="mb-5">{tabs}</div>}
        {children}
      </main>
    </div>
  );
};

export default StaffLayout;
