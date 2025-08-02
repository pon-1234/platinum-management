import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  onClick?: () => void;
}

const paddingConfig = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const shadowConfig = {
  none: "",
  sm: "shadow-sm",
  md: "shadow",
  lg: "shadow-lg",
};

export function Card({
  children,
  className = "",
  padding = "md",
  shadow = "md",
  hover = false,
  onClick,
}: CardProps) {
  const paddingClass = paddingConfig[padding];
  const shadowClass = shadowConfig[shadow];
  const hoverClass = hover
    ? "hover:shadow-md transition-shadow cursor-pointer"
    : "";

  return (
    <div
      className={`bg-white rounded-lg ${shadowClass} ${paddingClass} ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}
