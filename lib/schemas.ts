import { z } from "zod";

export const registrationSchema = z.object({
  fair_id: z.string().uuid({ message: "Missing fair selection." }),

  university_name: z
    .string()
    .min(2, "University name is required.")
    .max(200),
  university_country: z.string().min(2).max(80),
  university_website: z
    .string()
    .trim()
    .url("Please enter a valid URL (https://...).")
    .or(z.literal(""))
    .optional(),

  booth_type: z.enum(["Standard", "Premium"], {
    message: "Please pick a booth type.",
  }),
  number_of_reps: z
    .number({ message: "Please enter how many representatives are attending." })
    .int("Whole numbers only.")
    .min(1, "At least 1 representative.")
    .max(5, "Maximum 5 representatives."),

  contact_name: z.string().min(2, "Full name is required.").max(120),
  contact_title: z.string().max(120).optional(),
  contact_email: z.string().email("Please enter a valid email address."),
  contact_phone: z.string().max(40).optional(),

  special_requests: z.string().max(2000).optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const step1Schema = registrationSchema.pick({
  university_name: true,
  university_country: true,
  university_website: true,
  booth_type: true,
  number_of_reps: true,
});

export const step2Schema = registrationSchema.pick({
  contact_name: true,
  contact_title: true,
  contact_email: true,
  contact_phone: true,
  special_requests: true,
});
