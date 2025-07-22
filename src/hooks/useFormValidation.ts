import { useForm, UseFormProps, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getErrorMessage } from "@/lib/utils/validation";

interface UseFormValidationProps<T extends FieldValues>
  extends Omit<UseFormProps<T>, "resolver"> {
  schema: z.ZodType<T>;
}

export function useFormValidation<T extends FieldValues>({
  schema,
  ...formProps
}: UseFormValidationProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema) as any,
    ...formProps,
  });

  const handleAsyncSubmit = (
    onSubmit: (data: T) => Promise<void>,
    onError?: (error: unknown) => void
  ) => {
    return form.handleSubmit(async (data: T) => {
      try {
        await onSubmit(data);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        form.setError("root", { message: errorMessage });
        onError?.(error);
      }
    });
  };

  return {
    ...form,
    handleAsyncSubmit,
  };
}