interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  return (
    <div className={`text-red-600 text-sm font-medium ${className}`}>
      {message}
    </div>
  );
}
