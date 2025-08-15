import React, { ReactNode } from "react";

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
      className={`bg-white rounded-lg border ${shadowClass} ${paddingClass} ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export const CardHeader = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-6 pb-2 ${className}`}>{children}</div>;

export const CardTitle = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <h3 className={`text-xl font-semibold ${className}`}>{children}</h3>;

export const CardDescription = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <p className={`text-sm text-gray-600 mt-1 ${className}`}>{children}</p>;

export const CardContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-6 ${className}`}>{children}</div>;

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}
