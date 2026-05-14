import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, required, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-navy"
          >
            {label}
            {required && <span className="ml-0.5 text-gold-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-navy placeholder:text-navy/40",
            "transition-colors focus:outline-none focus:ring-2",
            error
              ? "border-red-400 focus:ring-red-300"
              : "border-navy/15 focus:border-navy focus:ring-gold/30",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-600">{error}</p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-navy/50">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, required, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-navy"
          >
            {label}
            {required && <span className="ml-0.5 text-gold-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={4}
          className={cn(
            "block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-navy placeholder:text-navy/40",
            "transition-colors focus:outline-none focus:ring-2",
            error
              ? "border-red-400 focus:ring-red-300"
              : "border-navy/15 focus:border-navy focus:ring-gold/30",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {!error && hint && <p className="mt-1.5 text-xs text-navy/50">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, id, required, children, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-navy"
          >
            {label}
            {required && <span className="ml-0.5 text-gold-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-navy",
            "transition-colors focus:outline-none focus:ring-2",
            error
              ? "border-red-400 focus:ring-red-300"
              : "border-navy/15 focus:border-navy focus:ring-gold/30",
            className
          )}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {!error && hint && <p className="mt-1.5 text-xs text-navy/50">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
