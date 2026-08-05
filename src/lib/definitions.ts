import * as z from "zod";

export const SignupFormSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." })
    .trim(),
});

export type SignupFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;
